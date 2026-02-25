import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import {
  subscribeUser,
  getSubscriptionStatus,
  getAllSubscriptions,
  updateSubscriptionStatus,
  getSubscriptionById,
  getSubscriptionByUserId,
} from "../controllers/subscription.controller.js";

const router = express.Router();

router.post("/create", verifyJWT, subscribeUser);
router.get("/", verifyJWT, getSubscriptionStatus);
router.get("/:id", verifyJWT, getSubscriptionById);

// Admin Routes
router.get("/admin/all", verifyJWT, isAdmin, getAllSubscriptions);
router.get("/user/:userId", verifyJWT, isAdmin, getSubscriptionByUserId);
router.patch("/admin/status/:id", verifyJWT, isAdmin, updateSubscriptionStatus);

export default router;
