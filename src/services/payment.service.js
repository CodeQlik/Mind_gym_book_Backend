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
import logger from "../utils/logger.js";
import subscriptionService from "./subscription.service.js";

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
      const subscription = await subscriptionService.subscribeUser({
        user_id: userId,
        plan_id: plan.id,
        payment_id: "FREE_PLAN",
      });

      return {
        message: "Free subscription activated successfully",
        subscription,
        isFree: true,
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

  //  SHARED: Book Order Payment (supports both Physical and Digital)
  async createBookOrderPayment(userId, orderData) {
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
      book_id: finalOrderData.book_id || null, 
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
    const isTestMode = process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_');
    const isDevBypass = isTestMode && razorpay_signature === 'test_signature';

    if (!isSignatureValid && !isDevBypass) {
      throw new Error("Invalid payment signature - potential fraud attempt");
    }

    if (isDevBypass) {
      logger.warn(" [PAYMENT]: Signature verification bypassed using 'test_signature' (RAZORPAY TEST MODE)");
    }

    /**
     * NOTE: For high-volume production systems, consider using Razorpay Webhooks 
     * in addition to this direct verification for improved reliability.
     */

    // 2. Find payment record
    const payment = await Payment.findOne({
      where: { order_id: razorpay_order_id },
    });
    if (!payment) throw new Error("Payment order record not found");

    // 3. Prevent double processing (Checks if fulfillment already happened)
    if (payment.status === "captured") {
      if (payment.payment_type === "subscription") {
        const existingSub = await Subscription.findOne({
          where: { payment_id: razorpay_payment_id },
        });
        if (existingSub) {
          return { payment, subscription: existingSub, message: "Already processed" };
        }
      } else if (payment.payment_type === "book_purchase") {
        const existingOrder = await Order.findOne({
          where: { razorpay_order_id: razorpay_order_id },
        });
        // If order exists and is paid, then it's already processed
        if (existingOrder && existingOrder.payment_status === "paid") {
          return { payment, order: existingOrder, message: "Already processed" };
        }
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

      const subscription = await subscriptionService.subscribeUser({
        user_id: payment.user_id,
        plan_id: plan ? plan.id : null,
        payment_id: razorpay_payment_id,
        payment_record_id: payment.id,
        razorpay_order_id: razorpay_order_id,
        amount: payment.amount,
      });

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

  // ─── ADMIN: Process actual refund via Razorpay
  async processRefund(orderId) {
    const order = await Order.findByPk(orderId, {
      include: [{ model: Book, as: 'books' }, 'items'] // Ensuring items are loaded for stock reversion
    });
    if (!order) throw new Error("The specified order was not found.");

    if (!order.refund_requested) {
      throw new Error("No refund request has been made for this order.");
    }

    if (order.payment_status === "refunded") {
      throw new Error("This order has already been refunded.");
    }

    // 1. Process money refund (Only if NOT COD)
    let refund = null;
    if (order.payment_method !== "cod") {
      const payment = await Payment.findOne({
        where: {
          order_id: order.razorpay_order_id,
          status: "captured",
        },
      });

      if (!payment || !payment.payment_id) {
        throw new Error(
          "No successful transaction record found to process the refund.",
        );
      }

      // Call Razorpay Refund API
      refund = await razorpay.payments.refund(payment.payment_id, {
        amount: Math.round(parseFloat(order.total_amount) * 100),
        notes: {
          reason: order.refund_reason || "Refund processed by admin",
          order_no: order.order_no,
        },
      });
      
      await payment.update({ status: "refunded" });
    }

    // 2. Revert Stock (Add items back to inventory for both COD/Prepaid)
    if (order.items && order.items.length > 0) {
      try {
        for (const item of order.items) {
          if (item.book_id) {
            await Book.increment('stock', {
              by: item.quantity,
              where: { id: item.book_id }
            });
          }
        }
        logger.info(`[REFUND]: Stock reverted for order ${order.order_no}`);
      } catch (stockErr) {
        logger.error(`[REFUND]: Failed to revert stock for order ${order.order_no}:`, stockErr);
      }
    }

    // 3. Update DB Status
    await order.update({
      refund_requested: false,
      payment_status: "refunded",
      status: "refunded" 
    });

    // Notify user about refund success
    try {
      const notificationService = (await import("./notification.service.js"))
        .default;
      await notificationService.sendToUser(
        order.user_id,
        "REFUND_PROCESSED",
        "💰 Refund Processed!",
        `Your refund for order ${order.order_no} has been processed successfully. The amount will be credited to your original payment source within 5-7 working days.`,
        { order_id: String(order.id), order_no: order.order_no },
      );
    } catch (notifErr) {
      console.error("Failed to send refund success notification:", notifErr);
    }

    return refund;
  }
}

export default new PaymentService();
