import express from "express";
import {
  createSubCategory,
  getSubCategories,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoryById,
  getSubCategoriesByCategoryId,
} from "../controllers/subCategory.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import upload from "../middlewares/multer.js";
import {
  subcategoryValidation,
  updateSubcategoryValidation,
} from "../validations/subCategory.validation.js";

const router = express.Router();

// Public Routes (Website)
router.get("/all", getSubCategories);
router.get("/:id", getSubCategoryById);
router.get("/category/:categoryId", getSubCategoriesByCategoryId);

// Admin Only Routes (Admin Panel)
router.post(
  "/add",
  verifyJWT,
  isAdmin,
  upload.single("image"),
  subcategoryValidation,
  createSubCategory,
);

router.put(
  "/update/:id",
  verifyJWT,
  isAdmin,
  upload.single("image"),
  updateSubcategoryValidation,
  updateSubCategory,
);
router.delete("/delete/:id", verifyJWT, isAdmin, deleteSubCategory);

export default router;
