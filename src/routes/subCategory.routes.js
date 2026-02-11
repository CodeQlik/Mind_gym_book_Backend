import express from "express";
import {
  createSubCategory,
  getSubCategories,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoryById,
  getSubCategoriesByCategoryId,
  getSubCategoriesByCategorySlug,
  toggleSubCategoryStatus,
  searchSubCategories,
} from "../controllers/subCategory.controller.js";
import {
  verifyJWT,
  optionalVerifyJWT,
} from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import upload from "../middlewares/multer.js";
import {
  subcategoryValidation,
  updateSubcategoryValidation,
} from "../validations/subCategory.validation.js";

const router = express.Router();

// Public Routes (Website)
router.get("/all", optionalVerifyJWT, getSubCategories);
router.get("/search", optionalVerifyJWT, searchSubCategories);
router.get("/:id(\\d+)", optionalVerifyJWT, getSubCategoryById);
router.get(
  "/category/:categoryId",
  optionalVerifyJWT,
  getSubCategoriesByCategoryId,
);
router.get(
  "/category/slug/:slug",
  optionalVerifyJWT,
  getSubCategoriesByCategorySlug,
);

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
router.patch("/toggle-status/:id", verifyJWT, isAdmin, toggleSubCategoryStatus);

export default router;
