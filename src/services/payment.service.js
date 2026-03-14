import Razorpay from "razorpay";
import crypto from "crypto";
import {
  Payment,
  User,
  Subscription,
  UserBook,
  Plan,
  Book,
  Order,
} from "../models/index.js";
import orderService from "./order.service.js";
import { redisClient } from "../config/redis.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
  //  APP: Subscription Payment

  async createSubscriptionOrder(userId, planType) {
    const plan = await Plan.findOne({
      where: { plan_type: planType, status: "active" },
    });
    if (!plan) {
      throw new Error(`Plan type '${planType}' not found or inactive`);
    }

    // If it's a FREE plan, skip Razorpay and return success
    if (plan.plan_type === "free" || plan.price <= 0) {
      const duration = parseInt(plan.duration_months) || 0;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(startDate.getMonth() + duration);

      // Expire previous active subscriptions
      await Subscription.update(
        { status: "expired" },
        { where: { user_id: userId, status: "active" } }
      );

      const subscription = await Subscription.create({
        user_id: userId,
        plan_id: plan.id,
        plan_type: plan.plan_type,
        amount: 0,
        status: "active",
        start_date: startDate,
        end_date: endDate,
        payment_id: "FREE_PLAN",
      });

      await User.update(
        {
          subscription_status: "active",
          subscription_plan: plan.plan_type,
          subscription_end_date: endDate,
        },
        { where: { id: userId } }
      );

      return { 
        message: "Free subscription activated successfully", 
        subscription, 
        isFree: true 
      };
    }

    const options = {
      amount: Math.round(plan.price * 100), // paise
      currency: "INR",
      receipt: `receipt_sub_${userId}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    await Payment.create({
      user_id: userId,
      order_id: order.id,
      amount: plan.price,
      payment_type: "subscription",
      plan_name: plan.plan_type,
      status: "created",
    });

    return { razorpay_order: order, plan };
  }

  //  WEBSITE: Physical Book Payment (Online: UPI / Card / Prepaid)
  async createPhysicalBookPaymentOrder(userId, orderData) {
    // If orderData is just an ID (backward compatibility or retry), we fetch from DB
    let dbOrder = null;
    let finalOrderData = orderData;

    if (typeof orderData === "number" || typeof orderData === "string") {
      dbOrder = await Order.findOne({
        where: { id: orderData, user_id: userId },
      });
      if (!dbOrder) throw new Error("Order not found");
      if (dbOrder.payment_status === "paid") {
        throw new Error("This order is already paid");
      }

      finalOrderData = {
        userId: dbOrder.user_id,
        total_amount: dbOrder.total_amount,
        payment_method: dbOrder.payment_method,
        db_order_id: dbOrder.id, // Flag to indicate it's already in DB
      };
    }

    const amount = Math.round(parseFloat(finalOrderData.total_amount) * 100); // paise
    const receiptId = `rzp_phys_${userId}_${crypto.randomUUID().split("-")[0]}`;

    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: receiptId,
    });

    // Store orderData in Redis for 1 hour
    // This allows us to create the order record ONLY after verification
    await redisClient.set(
      `rzp_order_info:${razorpayOrder.id}`,
      JSON.stringify(finalOrderData),
      { EX: 3600 },
    );

    // Record payment attempt (Payment record is created, but Order table is clean)
    await Payment.create({
      user_id: userId,
      order_id: razorpayOrder.id,
      amount: finalOrderData.total_amount,
      payment_type: "book_purchase",
      payment_method: finalOrderData.payment_method,
      status: "created",
    });

    return {
      razorpay_order: razorpayOrder,
      payment_method: finalOrderData.payment_method,
    };
  }

  //  SHARED: Verify Payment (handles both subscription + physical book)
  async verifyPayment(paymentData) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      paymentData;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing mandatory Razorpay payment details");
    }

    // 1. Signature Verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    // DEV ONLY: Allow 'test_signature' to bypass for Postman testing
    if (!isSignatureValid && razorpay_signature !== "test_signature") {
      throw new Error("Invalid payment signature - potential fraud attempt");
    }
    if (razorpay_signature === "test_signature") {
      console.warn(
        " [PAYMENT]: Signature verification bypassed using 'test_signature'",
      );
    }

    // 2. Find payment record
    const payment = await Payment.findOne({
      where: { order_id: razorpay_order_id },
    });
    if (!payment) throw new Error("Payment order record not found");

    // 3. Prevent double processing
    if (payment.status === "captured") {
      const existingSub = await Subscription.findOne({
        where: { payment_id: razorpay_payment_id },
      });

      if (existingSub) {
        return { payment, message: "Already processed" };
      }
    }

    // 4. Update payment record — save payment_method from Razorpay response
    let capturedMethod = null;
    try {
      const rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);
      const rzpMethod = rzpPayment?.method;
      if (rzpMethod === "upi") capturedMethod = "upi";
      else if (rzpMethod === "card") capturedMethod = "card";
      else capturedMethod = "prepaid"; // netbanking, wallet, etc.
    } catch (_) {}

    await payment.update({
      payment_id: razorpay_payment_id,
      signature: razorpay_signature,
      status: "captured",
      ...(capturedMethod && { payment_method: capturedMethod }),
    });

    // 5. Fulfillment based on payment type
    if (payment.payment_type === "subscription") {
      // ── APP: Activate subscription ──
      const plan = await Plan.findOne({
        where: { plan_type: payment.plan_name },
      });
      const duration = plan ? plan.duration_months : 1;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(startDate.getMonth() + duration);

      // Expire previous subscriptions
      await Subscription.update(
        { status: "expired" },
        { where: { user_id: payment.user_id, status: "active" } },
      );

      const subscription = await Subscription.create({
        user_id: payment.user_id,
        plan_id: plan ? plan.id : null,
        plan_type: payment.plan_name,
        amount: payment.amount,
        payment_id: razorpay_payment_id,
        payment_record_id: payment.id,
        razorpay_order_id: razorpay_order_id,
        start_date: startDate,
        end_date: endDate,
        status: "active",
      });

      await User.update(
        {
          subscription_status: "active",
          subscription_plan: payment.plan_name,
          subscription_end_date: endDate,
        },
        { where: { id: payment.user_id } },
      );

      // Notify user about subscription activation
      try {
        const notificationService = (await import("./notification.service.js"))
          .default;
        await notificationService.sendToUser(
          payment.user_id,
          "SUBSCRIPTION_ACTIVATED",
          "🎊 Subscription Activated!",
          `Congratulations! Your ${payment.plan_name.toUpperCase()} subscription is now active until ${endDate.toLocaleDateString()}. Enjoy unlimited reading!`,
          {
            plan: payment.plan_name,
            expiry_date: endDate.toISOString(),
          },
        );
      } catch (notifErr) {
        console.error("Failed to send subscription notification:", notifErr);
      }

      return { payment, subscription, message: "Subscription activated" };
    } else if (payment.payment_type === "book_purchase") {
      // ── WEBSITE: Finalize Physical Order ──
      // Fetch orderData from Redis
      const redisData = await redisClient.get(
        `rzp_order_info:${razorpay_order_id}`,
      );
      if (!redisData) {
        // Fallback: If not in Redis, maybe it was a retry for an existing DB order
        const markedOrder = await orderService.markOrderPaid(razorpay_order_id);
        return {
          payment,
          order: markedOrder,
          message: "Order payment confirmed",
        };
      }

      const orderData = JSON.parse(redisData);

      // If it was already in DB (retry flow)
      if (orderData.db_order_id) {
        const markedOrder = await orderService.markOrderPaid(razorpay_order_id);
        return {
          payment,
          order: markedOrder,
          message: "Order payment confirmed",
        };
      }

      // If NEW order (common flow): Finally save to DB
      const finalOrder = await orderService.finalizeOrder(
        orderData,
        razorpay_order_id,
      );
      // Clean up Redis
      await redisClient.del(`rzp_order_info:${razorpay_order_id}`);

      return {
        payment,
        order: finalOrder,
        message: "Order placed successfully",
      };
    }

    return { payment };
  }

  // ─── COD: Create payment record for Cash on Delivery orders
  async createCodPaymentRecord(userId, dbOrderId) {
    const dbOrder = await Order.findOne({
      where: { id: dbOrderId, user_id: userId },
    });
    if (!dbOrder) throw new Error("Order not found");
    if (dbOrder.payment_method !== "cod") {
      throw new Error("This order is not a COD order");
    }

    // Check if COD payment record already exists
    const existing = await Payment.findOne({
      where: { order_id: `cod_${dbOrderId}` },
    });
    if (existing) return { payment: existing, message: "Already recorded" };

    const payment = await Payment.create({
      user_id: userId,
      order_id: `cod_${dbOrderId}`, // Unique identifier for COD
      amount: dbOrder.total_amount,
      payment_type: "book_purchase",
      payment_method: "cod",
      status: "created", // COD: payment happens on delivery
    });

    return { payment, message: "COD order recorded" };
  }

  //  ADMIN

  async getAllPayments(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Payment.findAndCountAll({
      include: [
        { model: User, as: "user", attributes: ["id", "name", "email"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      payments: rows,
    };
  }
}

export default new PaymentService();
