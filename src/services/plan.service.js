import { Plan } from "../models/index.js";

class PlanService {
  async createPlan(data) {
    const {
      name,
      price,
      plan_type,
      description,
      duration_months,
      features,
      device_limit,
      book_read_limit,
    } = data;

    let duration = duration_months;
    if (!duration) {
      if (plan_type === "one_month") duration = 1;
      else if (plan_type === "three_month") duration = 3;
      else if (plan_type === "premium")
        duration = 12; // Default for premium
      else if (plan_type === "free") duration = 1; // Match UI: "Free access... for 1 month"
    }

    let dLimit = device_limit;
    if (!dLimit) {
      if (plan_type === "one_month") dLimit = 2;
      else if (plan_type === "three_month") dLimit = 3;
      else if (plan_type === "premium") dLimit = 5;
      else dLimit = 1; // Free
    }

    let bLimit = book_read_limit;
    if (bLimit === undefined) {
      if (plan_type === "one_month") bLimit = 50;
      else if (plan_type === "three_month") bLimit = 150;
      else if (plan_type === "premium")
        bLimit = -1; // Unlimited
      else bLimit = 5; // Free
    }

    const newPlan = await Plan.create({
      name,
      price,
      plan_type,
      description,
      duration_months: duration,
      features,
      device_limit: dLimit,
      book_read_limit: bLimit,
      is_ad_free: plan_type !== "free",
    });

    return newPlan;
  }

  async getAllPlans() {
    return await Plan.findAll({ where: { status: "active" } });
  }

  async getPlanById(id) {
    return await Plan.findByPk(id);
  }

  async updatePlan(id, data) {
    const plan = await Plan.findByPk(id);
    if (!plan) {
      throw new Error("Plan not found");
    }
    await plan.update(data);
    return plan;
  }

  async deletePlan(id) {
    const plan = await Plan.findByPk(id);
    if (!plan) {
      throw new Error("Plan not found");
    }
    await plan.update({ status: "inactive" });
    return plan;
  }
}

export default new PlanService();
