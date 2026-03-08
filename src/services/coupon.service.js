import { Coupon } from "../models/index.js";
import { Op } from "sequelize";

class CouponService {
  async createCoupon(data) {
    if (new Date(data.end_date) <= new Date(data.start_date || Date.now())) {
      throw new Error("End date must be after start date");
    }
    return await Coupon.create(data);
  }

  async getAllCoupons(filters = {}) {
    const where = {};
    if (filters.is_active !== undefined) {
      where.is_active =
        filters.is_active === "true" || filters.is_active === true;
    }
    return await Coupon.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
  }

  async getCouponByCode(code) {
    return await Coupon.findOne({ where: { code: code.toUpperCase() } });
  }

  async getCouponById(id) {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) throw new Error("Coupon not found");
    return coupon;
  }

  async updateCoupon(id, updates) {
    const coupon = await this.getCouponById(id);

    // If updating dates, validate them
    const startDate = updates.start_date || coupon.start_date;
    const endDate = updates.end_date || coupon.end_date;
    if (new Date(endDate) <= new Date(startDate)) {
      throw new Error("End date must be after start date");
    }

    return await coupon.update(updates);
  }

  async deleteCoupon(id) {
    const coupon = await this.getCouponById(id);
    await coupon.destroy();
    return true;
  }

  async validateCoupon(code, amount) {
    const coupon = await Coupon.findOne({
      where: {
        code: code.toUpperCase(),
        is_active: true,
        start_date: { [Op.lte]: new Date() },
        end_date: { [Op.gte]: new Date() },
      },
    });

    if (!coupon) throw new Error("Invalid or expired coupon code");

    if (
      coupon.usage_limit !== null &&
      coupon.used_count >= coupon.usage_limit
    ) {
      throw new Error("Coupon usage limit reached");
    }

    if (Number(amount) < Number(coupon.min_order_amount)) {
      throw new Error(
        `Minimum order amount for this coupon is ₹${coupon.min_order_amount}`,
      );
    }

    let discount = 0;
    const subtotal = Number(amount);

    if (coupon.discount_type === "percentage") {
      discount = (subtotal * Number(coupon.discount_value)) / 100;
      if (coupon.max_discount && discount > Number(coupon.max_discount)) {
        discount = Number(coupon.max_discount);
      }
    } else {
      discount = Number(coupon.discount_value);
    }

    return {
      coupon_id: coupon.id,
      code: coupon.code,
      discount_amount: Number(Math.min(discount, subtotal).toFixed(2)),
      total_amount: Number(Math.max(0, subtotal - discount).toFixed(2)),
    };
  }
}

export default new CouponService();
