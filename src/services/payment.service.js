import Razorpay from "razorpay";
import crypto from "crypto";
import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";
import {
  Payment,
  User,
  Subscription,
  UserBook,
  Plan,
  Book,
} from "../models/index.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
  async createSubscriptionOrder(userId, planType) {
    // 1. Fetch Plan details dynamically from DB
    const plan = await Plan.findOne({
      where: { plan_type: planType, status: "active" },
    });

    if (!plan) {
      throw new Error(`Plan type '${planType}' not found or inactive`);
    }

    const options = {
      amount: Math.round(plan.price * 100), // in paise
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

    return order;
  }

  async createBookOrder(userId, bookId) {
    // 1. Verify book exists and get actual price from DB (Security: don't trust frontend amount)
    const book = await Book.findByPk(bookId);
    if (!book) throw new Error("Book not found");
    if (!book.is_active) throw new Error("This book is currently unavailable");

    const options = {
      amount: Math.round(book.price * 100), // in paise
      currency: "INR",
      receipt: `receipt_book_${userId}_${bookId}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    await Payment.create({
      user_id: userId,
      order_id: order.id,
      amount: book.price,
      book_id: bookId,
      payment_type: "book_purchase",
      status: "created",
    });

    return order;
  }

  async verifyPayment(paymentData) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      paymentData;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing mandatory Razorpay payment details");
    }

    // 1. SECURITY: Actual Signature Verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    // ⚠️ DEVELOPMENT BYPASS: Allow 'test_signature' to skip real verification for Postman testing
    if (!isSignatureValid && razorpay_signature !== "test_signature") {
      throw new Error("Invalid payment signature - potential fraud attempt");
    }

    if (razorpay_signature === "test_signature") {
      console.warn(
        "⚠️ [PAYMENT]: Signature verification bypassed using 'test_signature'",
      );
    }

    const payment = await Payment.findOne({
      where: { order_id: razorpay_order_id },
    });
    if (!payment) throw new Error("Original payment order record not found");

    // 2. Prevent double processing
    if (payment.status === "captured") {
      return payment;
    }

    // 3. Update payment record
    await payment.update({
      payment_id: razorpay_payment_id,
      signature: razorpay_signature,
      status: "captured",
    });

    // 4. Fulfillment Logic
    if (payment.payment_type === "subscription") {
      const plan = await Plan.findOne({
        where: { plan_type: payment.plan_name },
      });

      const duration = plan ? plan.duration_months : 1;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(startDate.getMonth() + duration);

      // Create subscription record
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

      // Update user subscription status
      await User.update(
        {
          subscription_status: "active",
          subscription_plan: payment.plan_name,
          subscription_end_date: endDate,
        },
        { where: { id: payment.user_id } },
      );
    } else if (payment.payment_type === "book_purchase" && payment.book_id) {
      await UserBook.findOrCreate({
        where: { user_id: payment.user_id, book_id: payment.book_id },
        defaults: { purchase_date: new Date() },
      });
    }

    return payment;
  }

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
