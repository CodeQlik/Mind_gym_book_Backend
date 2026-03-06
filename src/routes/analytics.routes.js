import { Router } from "express";
import analyticsController from "../controllers/analytics.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";

const router = Router();

// Protect all analytics routes to Admin only
router.get(
  "/dashboard",
  verifyJWT,
  isAdmin,
  analyticsController.getDashboardStats,
);

export default router;
