import Bookmark from "../models/bookmark.model.js";
import sendResponse from "../utils/responseHandler.js";

export const toggleBookmark = async (req, res, next) => {
  try {
    const { bookId, pageNumber } = req.body;
    const userId = req.user.id;

    const existingBookmark = await Bookmark.findOne({
      where: {
        user_id: userId,
        book_id: bookId,
        page_number: pageNumber,
      },
    });

    if (existingBookmark) {
      await existingBookmark.destroy();
      return sendResponse(res, 200, true, "Bookmark removed successfully", {
        isBookmarked: false,
      });
    }

    const newBookmark = await Bookmark.create({
      user_id: userId,
      book_id: bookId,
      page_number: pageNumber,
    });

    return sendResponse(res, 201, true, "Bookmark added successfully", {
      bookmark: newBookmark,
      isBookmarked: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookBookmarks = async (req, res, next) => {
  try {
    const { id: bookId } = req.params;
    const userId = req.user.id;

    const bookmarks = await Bookmark.findAll({
      where: { user_id: userId, book_id: bookId },
      order: [["page_number", "ASC"]],
    });

    return sendResponse(
      res,
      200,
      true,
      "Bookmarks fetched successfully",
      bookmarks,
    );
  } catch (error) {
    next(error);
  }
};
