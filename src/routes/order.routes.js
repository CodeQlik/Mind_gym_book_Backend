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
  getOrderStats,
  searchOrders,
  dispatchOrder,
  updateOrderStatus,
  cancelOrder,
  deleteOrder,
} from "../controllers/order.controller.js";

const router = express.Router();

//USER Routes

router.post("/checkout", verifyJWT, checkoutFromCart);
router.get("/my-orders", verifyJWT, getMyOrders);
router.get("/my-orders/:orderId", verifyJWT, getMyOrderById);
router.post("/refund/:orderId", verifyJWT, requestRefund);
router.post("/cancel/:orderId", verifyJWT, cancelOrder);

// ─── ADMIN Routes ───
router.get("/admin/stats", verifyJWT, isAdmin, getOrderStats);
router.get("/admin/search", verifyJWT, isAdmin, searchOrders);
router.get("/admin/all", verifyJWT, isAdmin, getAllOrders);
router.get("/admin/:orderId", verifyJWT, isAdmin, getOrderByIdAdmin);
router.patch("/admin/dispatch/:orderId", verifyJWT, isAdmin, dispatchOrder);
router.patch("/admin/status/:orderId", verifyJWT, isAdmin, updateOrderStatus);
router.delete("/admin/delete/:orderId", verifyJWT, isAdmin, deleteOrder);

export default router;
