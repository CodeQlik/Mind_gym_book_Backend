import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import {
  checkoutFromCart,
  getMyOrders,
  getMyOrderById,
  requestRefund,
  getAllOrders,
  getOrderByIdAdmin,
  dispatchOrder,
  updateOrderStatus,
} from "../controllers/order.controller.js";

const router = express.Router();

//  User Routes
// Step 1: Place order from cart (creates DB order, payment_status = pending)
router.post("/checkout", verifyJWT, checkoutFromCart);

// List & detail
router.get("/my-orders", verifyJWT, getMyOrders);
router.get("/my-orders/:orderId", verifyJWT, getMyOrderById);

// Refund request
router.post("/refund/:orderId", verifyJWT, requestRefund);

// Admin Routes
router.get("/admin/all", verifyJWT, isAdmin, getAllOrders);
router.get("/admin/:orderId", verifyJWT, isAdmin, getOrderByIdAdmin);

// Dispatch order (sets tracking_id + delivery_status = shipped)
router.patch("/admin/dispatch/:orderId", verifyJWT, isAdmin, dispatchOrder);

// Generic status update
router.patch("/admin/status/:orderId", verifyJWT, isAdmin, updateOrderStatus);

export default router;
