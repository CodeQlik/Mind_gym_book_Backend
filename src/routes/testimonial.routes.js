import { Router } from "express";
import {
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "../controllers/testimonial.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import upload from "../middlewares/multer.js";

const router = Router();

// Public routes
router.get("/", getAllTestimonials);

// Admin routes
router.post("/", verifyJWT, isAdmin, upload.single("image"), createTestimonial);
router.put(
  "/:id",
  verifyJWT,
  isAdmin,
  upload.single("image"),
  updateTestimonial,
);
router.delete("/:id", verifyJWT, isAdmin, deleteTestimonial);

export default router;
