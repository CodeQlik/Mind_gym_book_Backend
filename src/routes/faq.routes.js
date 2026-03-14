import express from "express";
import {
  getAllFaqs,
  getAllFaqsAdmin,
  getFaqById,
  createFaq,
  updateFaq,
  toggleFaqStatus,
  deleteFaq,
} from "../controllers/faq.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllFaqs);

// Admin routes
router.get("/admin", verifyJWT, isAdmin, getAllFaqsAdmin);
router.get("/:id", getFaqById);
router.post("/", verifyJWT, isAdmin, createFaq);
router.put("/toggle-status/:id", verifyJWT, isAdmin, toggleFaqStatus);
router.put("/:id", verifyJWT, isAdmin, updateFaq);
router.delete("/:id", verifyJWT, isAdmin, deleteFaq);

export default router;
