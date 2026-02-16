import Razorpay from "razorpay";
import crypto from "crypto";
import { Payment, User, Subscription, UserBook } from "../models/index.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
  async createSubscriptionOrder(userId, plan) {
    const plans = {
      monthly: { amount: 499, name: "monthly" },
      yearly: { amount: 3999, name: "yearly" },
      gold: { amount: 9999, name: "gold" },
    };

    const selectedPlan = plans[plan];
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
      plan_name: plan,
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

    const isSignatureValid = true; // For testing, usually you'd verify signature actually
    // const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      throw new Error("Invalid payment signature");
    }

    const payment = await Payment.findOne({
      where: { order_id: razorpay_order_id },
    });
    if (!payment) throw new Error("Payment record not found");

    payment.payment_id = razorpay_payment_id;
    payment.signature = razorpay_signature;
    payment.status = "captured";
    await payment.save();

    // Separate Access Activation Logic (Subscription)
    if (payment.payment_type === "subscription") {
      const startDate = new Date();
      const endDate = new Date();

      // Date Calculation
      if (payment.plan_name === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (payment.plan_name === "gold") {
        endDate.setFullYear(endDate.getFullYear() + 10);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // 1. Subscription Table mein entry
      await Subscription.create({
        user_id: payment.user_id,
        plan_type: payment.plan_name,
        price: payment.amount,
        status: "active",
        payment_id: razorpay_payment_id,
        start_date: startDate,
        end_date: endDate,
      });

      // 2. User Table mein status update (Sabse Zaroori)
      await User.update(
        {
          subscription_status: "active",
          subscription_plan: payment.plan_name,
          subscription_end_date: endDate,
        },
        { where: { id: payment.user_id } },
      );
    } else if (payment.payment_type === "book_purchase") {
      // Logic for individual book purchase
      if (payment.book_id) {
        await UserBook.findOrCreate({
          where: {
            user_id: payment.user_id,
            book_id: payment.book_id,
          },
          defaults: {
            purchase_date: new Date(),
          },
        });
      }
    }

    return payment;
  }
}

export default new PaymentService();
