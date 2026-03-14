import { Plan } from "../models/index.js";

class PlanService {
  async createPlan(data) {
    const {
      name,
      price,
      plan_type,
      duration_months,
      description,
      features,
      device_limit,
      book_read_limit,
      is_ad_free,
      is_premium,
    } = data;

    const newPlan = await Plan.create({
      name,
      price,
      plan_type,
      duration_months: parseInt(duration_months) || 1,
      description,
      features,
      device_limit: parseInt(device_limit) || 1,
      book_read_limit:
        book_read_limit !== undefined ? parseInt(book_read_limit) : 5,
      is_ad_free: is_ad_free === "true" || is_ad_free === true,
      is_premium: is_premium === "true" || is_premium === true,
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
