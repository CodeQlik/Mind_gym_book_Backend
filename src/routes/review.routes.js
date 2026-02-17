import express from "express";
import {
  addReview,
  getBookReviews,
  deleteReview,
} from "../controllers/review.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public route to get reviews for a book
router.get("/book/:bookId", getBookReviews);

// Private routes
router.post("/add", verifyJWT, addReview);
router.delete("/delete/:id", verifyJWT, deleteReview);

export default router;
