import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getAdminCategories,
  getCategoryBySlug,
  searchCategories,
} from "../controllers/category.controller.js";
import {
  categoryValidation,
  updateCategoryValidation,
} from "../validations/category.validation.js";
import {
  verifyJWT,
  optionalVerifyJWT,
} from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

// Public routes
router.get("/all", optionalVerifyJWT, getCategories);
router.get("/search", optionalVerifyJWT, searchCategories);
router.get("/:id(\\d+)", optionalVerifyJWT, getCategoryById);
router.get("/:slug", optionalVerifyJWT, getCategoryBySlug);

// Admin only routes
router.get("/admin/all", verifyJWT, isAdmin, getAdminCategories);
router.post(
  "/add",
  verifyJWT,
  isAdmin,
  upload.single("image"),
  categoryValidation,
  createCategory,
);
router.put(
  "/update/:id",
  verifyJWT,
  isAdmin,
  upload.single("image"),
  updateCategoryValidation,
  updateCategory,
);
router.delete("/delete/:id", verifyJWT, isAdmin, deleteCategory);
router.patch("/toggle-status/:id", verifyJWT, isAdmin, toggleCategoryStatus);

export default router;
