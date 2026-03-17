import express from "express";
import contactController from "../controllers/contact.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";

const router = express.Router();

// Public Routes (Web User)
router.post("/submit", contactController.submit);

// Admin Routes
router.get("/admin/all", verifyJWT, isAdmin, contactController.getAll);
router.patch(
  "/admin/:id/status",
  verifyJWT,
  isAdmin,
  contactController.updateStatus,
);
router.delete("/admin/:id", verifyJWT, isAdmin, contactController.delete);

export default router;
