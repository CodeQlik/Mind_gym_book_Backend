import express from "express";
import {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  getAdminBooks,
  toggleBookStatus,
  getBooksByCategory,
  getBookBySlug,
  searchBooks,
} from "../controllers/book.controller.js";
import {
  bookValidation,
  updateBookValidation,
} from "../validations/book.validation.js";
import {
  verifyJWT,
  optionalVerifyJWT,
} from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

// Public routes
router.get("/all", optionalVerifyJWT, getAllBooks);
router.get("/search", optionalVerifyJWT, searchBooks);
router.get("/category/:categoryId", optionalVerifyJWT, getBooksByCategory);
router.get("/:id(\\d+)", optionalVerifyJWT, getBookById);
router.get("/:slug", optionalVerifyJWT, getBookBySlug);

// Admin only routes
router.get("/admin/all", verifyJWT, isAdmin, getAdminBooks);
router.post(
  "/add",
  verifyJWT,
  isAdmin,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "pdf_file", maxCount: 1 },
  ]),
  bookValidation,
  createBook,
);
router.put(
  "/update/:id",
  verifyJWT,
  isAdmin,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "pdf_file", maxCount: 1 },
  ]),
  updateBookValidation,
  updateBook,
);
router.delete("/delete/:id", verifyJWT, isAdmin, deleteBook);
router.patch("/toggle-status/:id", verifyJWT, isAdmin, toggleBookStatus);

export default router;
