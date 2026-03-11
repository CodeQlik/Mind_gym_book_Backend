import couponService from "../services/coupon.service.js";

class CouponController {
  async createCoupon(req, res) {
    try {
      const coupon = await couponService.createCoupon(req.body);
      res.status(201).json({ success: true, data: coupon });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getAllCoupons(req, res) {
    try {
      const coupons = await couponService.getAllCoupons(req.query);
      res.status(200).json({ success: true, data: coupons });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCouponById(req, res) {
    try {
      const coupon = await couponService.getCouponById(req.params.id);
      res.status(200).json({ success: true, data: coupon });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async updateCoupon(req, res) {
    try {
      const coupon = await couponService.updateCoupon(req.params.id, req.body);
      res.status(200).json({ success: true, data: coupon });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deleteCoupon(req, res) {
    try {
      await couponService.deleteCoupon(req.params.id);
      res
        .status(200)
        .json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async validateCoupon(req, res) {
    try {
      const { code, amount } = req.body;
      if (!code || !amount) throw new Error("Code and amount are required");
      const result = await couponService.validateCoupon(code, amount);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export default new CouponController();
