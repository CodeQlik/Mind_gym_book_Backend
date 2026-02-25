import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import {
  createPhysicalOrder,
  getMyOrders,
  requestRefund,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/order.controller.js";

const router = express.Router();

// User Routes
router.post("/create", verifyJWT, createPhysicalOrder);
router.get("/my-orders", verifyJWT, getMyOrders);
router.post("/refund/:orderId", verifyJWT, requestRefund);

// Admin Routes
router.get("/admin/all", verifyJWT, isAdmin, getAllOrders);
router.patch("/admin/status/:id", verifyJWT, isAdmin, updateOrderStatus);

export default router;
