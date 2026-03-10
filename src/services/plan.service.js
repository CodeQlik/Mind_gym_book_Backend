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
    } = data;

    let duration = duration_months;
    if (!duration) {
      if (plan_type === "one_month") duration = 1;
      else if (plan_type === "three_month") duration = 3;
      else if (plan_type === "one_year") duration = 12;
      else if (plan_type === "free") duration = 0;
    }

    let dLimit = device_limit;
    if (!dLimit) {
      if (plan_type === "one_month") dLimit = 2;
      else if (plan_type === "three_month") dLimit = 3;
      else if (plan_type === "one_year") dLimit = 4;
      else dLimit = 1;
    }

    const newPlan = await Plan.create({
      name,
      price,
      plan_type,
      description,
      duration_months: duration,
      features,
      device_limit: dLimit,
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
