import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan,
} from "../controllers/plan.controller.js";

const router = express.Router();

// Public/User routes
router.get("/", getAllPlans);
router.get("/:id", getPlanById);

// Admin routes
router.post("/", verifyJWT, isAdmin, createPlan);
router.put("/:id", verifyJWT, isAdmin, updatePlan);
router.delete("/:id", verifyJWT, isAdmin, deletePlan);

export default router;
