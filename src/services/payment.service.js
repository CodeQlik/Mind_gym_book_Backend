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

  //  WEBSITE: Physical Book Payment
  async createPhysicalBookPaymentOrder(userId, dbOrderId) {
    const dbOrder = await Order.findOne({
      where: { id: dbOrderId, user_id: userId },
    });
    if (!dbOrder) throw new Error("Order not found");
    if (dbOrder.payment_status === "paid") {
      throw new Error("This order is already paid");
    }

    const amount = Math.round(parseFloat(dbOrder.total_amount) * 100); // paise

    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_phys_${userId}_${dbOrderId}_${Date.now()}`,
    });

    // Record payment attempt
    await Payment.create({
      user_id: userId,
      order_id: razorpayOrder.id,
      amount: dbOrder.total_amount,
      payment_type: "book_purchase",
      status: "created",
      // book_id is null — order items contain the books
    });

    // Link Razorpay order ID to our DB order
    await orderService.linkRazorpayOrder(dbOrderId, razorpayOrder.id);

    return { razorpay_order: razorpayOrder, db_order_id: dbOrderId };
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
      return { payment, message: "Already processed" };
    }

    // 4. Update payment record
    await payment.update({
      payment_id: razorpay_payment_id,
      signature: razorpay_signature,
      status: "captured",
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

      await Subscription.create({
        user_id: payment.user_id,
        plan_id: plan ? plan.id : null,
        plan_type: payment.plan_name,
        amount: payment.amount,
        payment_id: razorpay_payment_id,
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

      return { payment, message: "Subscription activated" };
    } else if (payment.payment_type === "book_purchase") {
      // ── WEBSITE: Mark physical order as paid ──
      const markedOrder = await orderService.markOrderPaid(razorpay_order_id);
      if (markedOrder) {
        console.log(
          `[PAYMENT] Physical order #${markedOrder.id} marked as paid`,
        );
      }
      return {
        payment,
        order: markedOrder,
        message: "Order payment confirmed",
      };
    }

    return { payment };
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
