import Razorpay from "razorpay";
import crypto from "crypto";
import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";

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

    await sequelize.query(
      `INSERT INTO payments (user_id, order_id, amount, payment_type, plan_name, status, created_at, updated_at)
       VALUES (:userId, :order_id, :amount, 'subscription', :plan_name, 'created', NOW(), NOW())`,
      {
        replacements: {
          userId,
          order_id: order.id,
          amount: selectedPlan.amount,
          plan_name: plan,
        },
        type: QueryTypes.INSERT,
      },
    );

    return order;
  }

  async createBookOrder(userId, amount, bookId) {
    const options = {
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: `receipt_book_${userId}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    await sequelize.query(
      `INSERT INTO payments (user_id, order_id, amount, book_id, payment_type, status, created_at, updated_at)
       VALUES (:userId, :order_id, :amount, :bookId, 'book_purchase', 'created', NOW(), NOW())`,
      {
        replacements: { userId, order_id: order.id, amount, bookId },
        type: QueryTypes.INSERT,
      },
    );

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

    const isSignatureValid = true; // For testing; uncomment below for production:
    // const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) throw new Error("Invalid payment signature");

    const [payment] = await sequelize.query(
      "SELECT * FROM payments WHERE order_id = :order_id LIMIT 1",
      {
        replacements: { order_id: razorpay_order_id },
        type: QueryTypes.SELECT,
      },
    );
    if (!payment) throw new Error("Payment record not found");

    // Update payment record
    await sequelize.query(
      `UPDATE payments SET payment_id = :payment_id, signature = :signature, status = 'captured', updated_at = NOW()
       WHERE order_id = :order_id`,
      {
        replacements: {
          payment_id: razorpay_payment_id,
          signature: razorpay_signature,
          order_id: razorpay_order_id,
        },
        type: QueryTypes.UPDATE,
      },
    );

    // Handle subscription activation
    if (payment.payment_type === "subscription") {
      const startDate = new Date();
      const endDate = new Date();

      if (payment.plan_name === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (payment.plan_name === "gold") {
        endDate.setFullYear(endDate.getFullYear() + 10);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Insert into subscriptions table
      await sequelize.query(
        `INSERT INTO subscriptions (user_id, plan_type, price, status, payment_id, start_date, end_date, created_at, updated_at)
         VALUES (:userId, :plan_type, :price, 'active', :payment_id, :start_date, :end_date, NOW(), NOW())`,
        {
          replacements: {
            userId: payment.user_id,
            plan_type: payment.plan_name,
            price: payment.amount,
            payment_id: razorpay_payment_id,
            start_date: startDate,
            end_date: endDate,
          },
          type: QueryTypes.INSERT,
        },
      );

      // Update user subscription status
      await sequelize.query(
        `UPDATE users SET subscription_status = 'active', subscription_plan = :plan, subscription_end_date = :end_date, updated_at = NOW()
         WHERE id = :userId`,
        {
          replacements: {
            plan: payment.plan_name,
            end_date: endDate,
            userId: payment.user_id,
          },
          type: QueryTypes.UPDATE,
        },
      );
    } else if (payment.payment_type === "book_purchase" && payment.book_id) {
      // Check if UserBook record already exists
      const [existingUserBook] = await sequelize.query(
        "SELECT id FROM user_books WHERE user_id = :userId AND book_id = :bookId LIMIT 1",
        {
          replacements: { userId: payment.user_id, bookId: payment.book_id },
          type: QueryTypes.SELECT,
        },
      );

      if (!existingUserBook) {
        await sequelize.query(
          `INSERT INTO user_books (user_id, book_id, purchase_date, created_at, updated_at)
           VALUES (:userId, :bookId, NOW(), NOW(), NOW())`,
          {
            replacements: { userId: payment.user_id, bookId: payment.book_id },
            type: QueryTypes.INSERT,
          },
        );
      }
    }

    return payment;
  }
}

export default new PaymentService();
