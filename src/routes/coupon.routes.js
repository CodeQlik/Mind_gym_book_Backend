import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import couponController from "../controllers/coupon.controller.js";

const router = express.Router();

// ADMIN Routes (CRUD)
router.post("/admin/create", verifyJWT, isAdmin, couponController.createCoupon);
router.get("/admin/all", verifyJWT, isAdmin, couponController.getAllCoupons);
router.get("/admin/:id", verifyJWT, isAdmin, couponController.getCouponById);
router.patch(
  "/admin/update/:id",
  verifyJWT,
  isAdmin,
  couponController.updateCoupon,
);
router.delete(
  "/admin/delete/:id",
  verifyJWT,
  isAdmin,
  couponController.deleteCoupon,
);

// USER Routes
router.post("/validate", verifyJWT, couponController.validateCoupon);

export default router;
