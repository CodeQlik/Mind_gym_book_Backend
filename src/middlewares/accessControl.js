import { UserBook, Subscription, Book } from "../models/index.js";
import { Op } from "sequelize";

export const checkBookAccess = async (req, res, next) => {
  try {
    const { id, pageNumber } = req.params;
    const user = req.user;

    if (user.user_type === "admin") {
      return next();
    }

    if (parseInt(pageNumber) <= 5) {
      return next();
    }

    const book = await Book.findByPk(id);
    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    if (!book.is_premium) {
      return next();
    }

    const purchase = await UserBook.findOne({
      where: { user_id: user.id, book_id: id },
    });
    if (purchase) {
      return next();
    }

    if (user.subscription_status === "active") {
      const now = new Date();
      if (
        !user.subscription_end_date ||
        new Date(user.subscription_end_date) >= now
      ) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      showPaywall: true,
      message: "subscription ya book purchase zaroori hai.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
