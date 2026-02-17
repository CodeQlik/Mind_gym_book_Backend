import { Bookmark, Book } from "../models/index.js";
import sendResponse from "../utils/responseHandler.js";

export const toggleBookmark = async (req, res, next) => {
  try {
    const { bookId, book_id } = req.body;
    const userId = req.user.id;
    const actualBookId = bookId || book_id;

    const existingBookmark = await Bookmark.findOne({
      where: {
        user_id: userId,
        book_id: actualBookId,
      },
    });

    if (existingBookmark) {
      await existingBookmark.destroy();
      return sendResponse(res, 200, true, "Book removed from bookmarks", {
        isBookmarked: false,
      });
    }

    const newBookmark = await Bookmark.create({
      user_id: userId,
      book_id: actualBookId,
    });

    return sendResponse(res, 201, true, "Book added to bookmarks", {
      bookmark: newBookmark,
      isBookmarked: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserBookmarks = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const bookmarks = await Bookmark.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Book,
          as: "book",
          attributes: [
            "id",
            "title",
            "author",
            "slug",
            "thumbnail",
            "price",
            "is_premium",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return sendResponse(
      res,
      200,
      true,
      "User bookmarks fetched successfully",
      bookmarks,
    );
  } catch (error) {
    next(error);
  }
};
