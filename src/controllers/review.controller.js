import { Review, Book, User } from "../models/index.js";
import sendResponse from "../utils/responseHandler.js";

export const addReview = async (req, res, next) => {
  try {
    const { bookId, rating, comment } = req.body;
    const userId = req.user.id;

    // Check if book exists
    const book = await Book.findByPk(bookId);
    if (!book) {
      return sendResponse(res, 404, false, "Book not found");
    }

    // Check if user already reviewed this book (optional, but common)
    const existingReview = await Review.findOne({
      where: { user_id: userId, book_id: bookId },
    });

    if (existingReview) {
      return sendResponse(
        res,
        400,
        false,
        "You have already reviewed this book",
      );
    }

    const review = await Review.create({
      user_id: userId,
      book_id: bookId,
      rating,
      comment,
    });

    return sendResponse(res, 201, true, "Review added successfully", review);
  } catch (error) {
    next(error);
  }
};

export const getBookReviews = async (req, res, next) => {
  try {
    const { bookId } = req.params;

    const reviews = await Review.findAll({
      where: { book_id: bookId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "profile"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (reviews.length === 0) {
      return sendResponse(res, 200, true, "No reviews found for this book", []);
    }

    return sendResponse(
      res,
      200,
      true,
      "Reviews fetched successfully",
      reviews,
    );
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const review = await Review.findByPk(id);

    if (!review) {
      return sendResponse(res, 404, false, "Review not found");
    }

    // Only allow the user who wrote the review or an admin to delete it
    if (review.user_id !== userId && req.user.user_type !== "admin") {
      return sendResponse(
        res,
        403,
        false,
        "Access denied. You can only delete your own reviews.",
      );
    }

    await review.destroy();

    return sendResponse(res, 200, true, "Review deleted successfully");
  } catch (error) {
    next(error);
  }
};
