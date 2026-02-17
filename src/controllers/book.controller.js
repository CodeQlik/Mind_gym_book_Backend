import bookService from "../services/book.service.js";
import sendResponse from "../utils/responseHandler.js";

import {
  User,
  Book,
  Subscription,
  UserBook,
  Bookmark,
} from "../models/index.js";
import { Op } from "sequelize";

export const createBook = async (req, res, next) => {
  try {
    const book = await bookService.createBook(req.body, req.files);
    return sendResponse(res, 201, true, "Book added successfully", book);
  } catch (error) {
    next(error);
  }
};

export const getAllBooks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    const isAdminRequest = req.user && req.user.user_type === "admin";
    let filters = isAdminRequest ? {} : { is_active: true };

    if (status && isAdminRequest) {
      if (status === "active") filters.is_active = true;
      if (status === "inactive") filters.is_active = false;
    }

    const result = await bookService.getBooks(filters, page, limit);

    if (result.books.length === 0) {
      return sendResponse(res, 200, true, "No books found", {
        books: [],
        totalItems: 0,
        totalPages: 0,
        currentPage: page,
      });
    }
    return sendResponse(res, 200, true, "Books fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

// Admin: All books including inactive
export const getAdminBooks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await bookService.getBooks({}, page, limit);

    if (result.books.length === 0) {
      return sendResponse(res, 200, true, "No books found in inventory", {
        books: [],
        totalItems: 0,
        totalPages: 0,
        currentPage: page,
      });
    }
    return sendResponse(
      res,
      200,
      true,
      "Admin books fetched successfully",
      result,
    );
  } catch (error) {
    next(error);
  }
};

export const getBookById = async (req, res, next) => {
  try {
    // Publicly we only show active books
    const isAdminRequest = req.user && req.user.user_type === "admin";
    const book = await bookService.getBookById(req.params.id, !isAdminRequest);

    let isBookmarked = false;
    if (req.user) {
      const bookmark = await Bookmark.findOne({
        where: { user_id: req.user.id, book_id: book.id },
      });
      isBookmarked = !!bookmark;
    }

    return sendResponse(res, 200, true, "Book fetched successfully", {
      ...book.toJSON(),
      isBookmarked,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookBySlug = async (req, res, next) => {
  try {
    const isAdminRequest = req.user && req.user.user_type === "admin";
    const book = await bookService.getBookBySlug(
      req.params.slug,
      !isAdminRequest,
    );

    let isBookmarked = false;
    if (req.user) {
      const bookmark = await Bookmark.findOne({
        where: { user_id: req.user.id, book_id: book.id },
      });
      isBookmarked = !!bookmark;
    }

    return sendResponse(res, 200, true, "Book fetched successfully", {
      ...book.toJSON(),
      isBookmarked,
    });
  } catch (error) {
    next(error);
  }
};

export const getBooksByCategory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const isAdminRequest = req.user && req.user.user_type === "admin";

    const result = await bookService.getBooksByCategoryId(
      req.params.categoryId,
      !isAdminRequest,
      page,
      limit,
    );

    if (result.books.length === 0) {
      return sendResponse(res, 200, true, "No books found for this category", {
        books: [],
        totalItems: 0,
        totalPages: 0,
        currentPage: page,
      });
    }
    return sendResponse(
      res,
      200,
      true,
      "Category books fetched successfully",
      result,
    );
  } catch (error) {
    next(error);
  }
};

export const updateBook = async (req, res, next) => {
  try {
    const book = await bookService.updateBook(
      req.params.id,
      req.body,
      req.files,
    );
    return sendResponse(res, 200, true, "Book updated successfully", book);
  } catch (error) {
    next(error);
  }
};

export const deleteBook = async (req, res, next) => {
  try {
    await bookService.deleteBook(req.params.id);
    return sendResponse(res, 200, true, "Book deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const toggleBookStatus = async (req, res, next) => {
  try {
    const book = await bookService.toggleBookStatus(req.params.id);
    return sendResponse(
      res,
      200,
      true,
      `Book ${book.is_active ? "activated" : "deactivated"} successfully`,
      book,
    );
  } catch (error) {
    next(error);
  }
};
export const searchBooks = async (req, res, next) => {
  try {
    const { q, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const isAdminRequest = req.user && req.user.user_type === "admin";
    const result = await bookService.searchBooks(
      q,
      !isAdminRequest,
      page,
      limit,
      status,
    );

    if (result.books.length === 0) {
      return sendResponse(
        res,
        200,
        true,
        "No books found matches your search",
        {
          books: [],
          totalItems: 0,
          totalPages: 0,
          currentPage: page,
        },
      );
    }
    return sendResponse(res, 200, true, "Search results fetched", result);
  } catch (error) {
    next(error);
  }
};

export const readBookPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const userId = user?.id;
    const userType = user?.user_type;

    const book = await Book.findByPk(id);
    if (!book)
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });

    if (!book.pdf_file || !book.pdf_file.url) {
      return res
        .status(404)
        .json({ success: false, message: "PDF file not found for this book" });
    }

    let pdfUrl = book.pdf_file.url;
    let isRestricted = false;

    // Admin has full access
    if (userType !== "admin") {
      if (book.is_premium) {
        let hasAccess = false;

        if (userId) {
          // Check individual book purchase
          const purchase = await UserBook.findOne({
            where: { user_id: userId, book_id: id },
          });

          if (purchase) {
            hasAccess = true;
          } else {
            // Check active subscription
            const now = new Date();
            const hasActiveSubscription =
              user.subscription_status === "active" &&
              user.subscription_end_date &&
              new Date(user.subscription_end_date) >= now;

            if (hasActiveSubscription) {
              hasAccess = true;
            }
          }
        }

        if (!hasAccess) {
          isRestricted = true;
        }
      }
    }

    if (isRestricted) {
      // Cloudinary transformation for first 5 pages
      if (pdfUrl.includes("/upload/")) {
        pdfUrl = pdfUrl.replace("/upload/", "/upload/pg_1-5/");
      }
      res.setHeader("X-Subscription-Required", "true");
    }

    // Redirect to the (possibly restricted) Cloudinary URL
    return res.redirect(pdfUrl);
  } catch (error) {
    console.error("Error redirecting to PDF:", error);
    next(error);
  }
};
