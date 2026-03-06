import { Subscription, Plan, User } from "../models/index.js";

class SubscriptionService {
  async subscribeUser(data) {
    const { user_id, plan_id, payment_id, payment_record_id } = data;

    if (!plan_id) {
      throw new Error("plan_id is required to create a subscription");
    }

    const plan = await Plan.findByPk(parseInt(plan_id));
    if (!plan) {
      throw new Error("Invalid Plan: Plan not found with the provided ID");
    }

    const duration = parseInt(plan.duration_months) || 0;
    const start_date = new Date();
    const end_date = new Date();
    end_date.setMonth(start_date.getMonth() + duration);

    // Deactivate previous active subscriptions for this user if any
    await Subscription.update(
      { status: "expired" },
      { where: { user_id, status: "active" } },
    );

    const newSubscription = await Subscription.create({
      user_id,
      plan_id,
      plan_type: plan.plan_type,
      amount: plan.price, // Storing plan price in subscription record
      payment_id,
      payment_record_id,
      start_date,
      end_date,
      status: "active",
    });

    // Update User record
    await User.update(
      {
        subscription_status: "active",
        subscription_end_date: end_date,
        subscription_plan: plan.plan_type, // Map appropriate plan type if needed
      },
      { where: { id: user_id } },
    );

    return newSubscription;
  }

  async getUserSubscription(userId) {
    return await Subscription.findOne({
      where: { user_id: userId, status: "active" },
      order: [["createdAt", "DESC"]],
      include: [{ model: Plan, as: "plan" }],
    });
  }

  async getAllSubscriptions(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Subscription.findAndCountAll({
      include: [
        { model: User, as: "user", attributes: ["id", "name", "email"] },
        { model: Plan, as: "plan" },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      subscriptions: rows,
    };
  }

  async updateSubscriptionStatus(id, status) {
    const subscription = await Subscription.findByPk(id);
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    await subscription.update({ status });

    if (status === "active") {
      await User.update(
        {
          subscription_status: "active",
          subscription_end_date: subscription.end_date,
        },
        { where: { id: subscription.user_id } },
      );
    } else {
      await User.update(
        { subscription_status: status },
        { where: { id: subscription.user_id } },
      );
    }

    return subscription;
  }

  async getSubscriptionById(id) {
    return await Subscription.findByPk(id, {
      include: [
        { model: User, as: "user", attributes: ["id", "name", "email"] },
        { model: Plan, as: "plan" },
      ],
    });
  }
}

export default new SubscriptionService();
