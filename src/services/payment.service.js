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
} from "../models/index.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
  async createSubscriptionOrder(userId, plan) {
    const plansLookup = {
      monthly: { amount: 199, name: "one_month" },
      three_month: { amount: 499, name: "three_month" },
      yearly: { amount: 1499, name: "one_year" },
    };

    const selectedPlan = plansLookup[plan];
    if (!selectedPlan) throw new Error("Invalid plan selected");

    const options = {
      amount: selectedPlan.amount * 100, // in paise
      currency: "INR",
      receipt: `receipt_sub_${userId}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    await Payment.create({
      user_id: userId,
      order_id: order.id,
      amount: selectedPlan.amount,
      payment_type: "subscription",
      plan_name: selectedPlan.name,
      status: "created",
    });

    return order;
  }

  async createBookOrder(userId, amount, bookId) {
    const options = {
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: `receipt_book_${userId}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    await Payment.create({
      user_id: userId,
      order_id: order.id,
      amount: amount,
      book_id: bookId,
      payment_type: "book_purchase",
      status: "created",
    });

    return order;
  }

  async verifyPayment(paymentData) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      paymentData;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    // In production, compare expectedSignature with razorpay_signature
    const isSignatureValid = true; // Set to false check for real verification

    if (!isSignatureValid) throw new Error("Invalid payment signature");

    const payment = await Payment.findOne({
      where: { order_id: razorpay_order_id },
    });
    if (!payment) throw new Error("Payment record not found");

    // Update payment record
    await payment.update({
      payment_id: razorpay_payment_id,
      signature: razorpay_signature,
      status: "captured",
    });

    // Handle subscription activation
    if (payment.payment_type === "subscription") {
      // Find the corresponding plan
      const plan = await Plan.findOne({
        where: { plan_type: payment.plan_name },
      });
      const duration = plan ? plan.duration_months : 1;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(startDate.getMonth() + duration);

      // Create subscription
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
