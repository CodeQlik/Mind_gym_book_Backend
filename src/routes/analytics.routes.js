import { Router } from "express";
import analyticsController from "../controllers/analytics.controller.js";
import { getErrorLogs, clearLogs } from "../controllers/admin.controller.js";
import { verifyJWT, optionalVerifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";

const router = Router();

// Protect all analytics routes to Admin only
router.get(
  "/dashboard",
  verifyJWT,
  isAdmin,
  analyticsController.getDashboardStats,
);

router.get(
  "/top-selling-books-week",
  optionalVerifyJWT,
  analyticsController.getTopSellingBooksThisWeek,
);

router.get("/logs", verifyJWT, isAdmin, getErrorLogs);
router.delete("/logs/clear", verifyJWT, isAdmin, clearLogs);

export default router;
