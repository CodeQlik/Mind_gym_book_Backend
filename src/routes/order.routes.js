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
  dispatchWithShiprocket,
  cancelOrder,
  deleteOrder,
  approveRefund,
  refreshShiprocketStatus,
  handleShiprocketWebhook,
  shiprocketAssignAWB,
  shiprocketSchedulePickup,
  shiprocketGetLabel,
  shiprocketGetManifest,
} from "../controllers/order.controller.js";

const router = express.Router();

//USER Routes

router.post("/checkout", verifyJWT, checkoutFromCart);
router.get("/my-orders", verifyJWT, getMyOrders);
router.get("/my-orders/:orderId", verifyJWT, getMyOrderById);
router.post("/refund/:orderId", verifyJWT, requestRefund);
router.post("/cancel/:orderId", verifyJWT, cancelOrder);
router.get("/invoice/:orderId", verifyJWT, (req, res, next) => {
  // We'll define downloadInvoice in controller next
  import("../controllers/order.controller.js").then((ctrl) =>
    ctrl.downloadInvoice(req, res, next),
  );
});

// ─── ADMIN Routes ───
router.get("/admin/stats", verifyJWT, isAdmin, getOrderStats);
router.get("/admin/search", verifyJWT, isAdmin, searchOrders);
router.get("/admin/all", verifyJWT, isAdmin, getAllOrders);
router.get("/admin/:orderId", verifyJWT, isAdmin, getOrderByIdAdmin);
router.patch("/admin/dispatch/:orderId", verifyJWT, isAdmin, dispatchOrder);
router.patch("/admin/dispatch-shiprocket/:orderId", verifyJWT, isAdmin, dispatchWithShiprocket);
router.patch("/admin/status/:orderId", verifyJWT, isAdmin, updateOrderStatus);
router.post("/admin/approve-refund/:orderId", verifyJWT, isAdmin, approveRefund);
router.get("/admin/refresh-shiprocket/:orderId", verifyJWT, isAdmin, refreshShiprocketStatus);
router.delete("/admin/delete/:orderId", verifyJWT, isAdmin, deleteOrder);
router.post("/admin/shiprocket/assign-awb/:orderId", verifyJWT, isAdmin, shiprocketAssignAWB);
router.post("/admin/shiprocket/schedule-pickup/:orderId", verifyJWT, isAdmin, shiprocketSchedulePickup);
router.get("/admin/shiprocket/label/:orderId", verifyJWT, isAdmin, shiprocketGetLabel);
router.get("/admin/shiprocket/manifest/:orderId", verifyJWT, isAdmin, shiprocketGetManifest);

// ─── EXTERNAL Webhooks ───
router.post("/fulfillment-update", handleShiprocketWebhook);

export default router;
