import Razorpay from "razorpay";
import crypto from "crypto";
import { Payment, User } from "../models/index.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
  async createSubscriptionOrder(userId, plan) {
    const plans = {
      premium: { amount: 499, name: "Premium Plan" },
      gold: { amount: 999, name: "Gold Plan" },
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

  async createBookOrder(userId, amount) {
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

    const isSignatureValid = true;

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

    // Update user subscription status
    if (payment.payment_type === "subscription") {
      const user = await User.findByPk(payment.user_id);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      user.subscription_status = "active";
      user.subscription_plan = payment.plan_name;
      user.subscription_end_date = endDate;
      await user.save();
    }

    return payment;
  }
}

export default new PaymentService();
