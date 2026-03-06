import wishlistService from "../services/wishlist.service.js";
import sendResponse from "../utils/responseHandler.js";

export const addToWishlist = async (req, res, next) => {
  try {
    const book_id = req.body.book_id || req.body.bookId;
    if (!book_id) {
      return sendResponse(res, 400, false, "Book ID is required");
    }
    const item = await wishlistService.addToWishlist(req.user.id, book_id);
    return sendResponse(res, 201, true, "Added to wishlist", item);
  } catch (error) {
    next(error);
  }
};

export const getWishlist = async (req, res, next) => {
  try {
    const list = await wishlistService.getWishlist(req.user.id);
    return sendResponse(res, 200, true, "Wishlist fetched successfully", list);
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist = async (req, res, next) => {
  try {
    const { id } = req.params;
    await wishlistService.removeFromWishlist(req.user.id, id);
    return sendResponse(res, 200, true, "Removed from wishlist");
  } catch (error) {
    next(error);
  }
};

export const toggleWishlist = async (req, res, next) => {
  try {
    const book_id = req.body.book_id || req.body.bookId;
    if (!book_id) {
      return sendResponse(res, 400, false, "Book ID is required");
    }
    const result = await wishlistService.toggleWishlist(req.user.id, book_id);
    return sendResponse(
      res,
      200,
      true,
      `Item ${result.action} successfully`,
      result,
    );
  } catch (error) {
    next(error);
  }
};
