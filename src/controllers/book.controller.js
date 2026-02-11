import bookService from "../services/book.service.js";
import sendResponse from "../utils/responseHandler.js";
import { validationResult } from "express-validator";

export const createBook = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(
        res,
        400,
        false,
        errors.array()[0].msg,
        errors.array(),
      );
    }

    const book = await bookService.createBook(req.body, req.file);
    return sendResponse(res, 201, true, "Book added successfully", book);
  } catch (error) {
    next(error);
  }
};

export const getAllBooks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const isAdminRequest = req.user && req.user.user_type === "admin";
    const filters = isAdminRequest ? {} : { is_active: true };
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
    return sendResponse(res, 200, true, "Book fetched successfully", book);
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
    return sendResponse(res, 200, true, "Book fetched successfully", book);
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(
        res,
        400,
        false,
        errors.array()[0].msg,
        errors.array(),
      );
    }

    const book = await bookService.updateBook(
      req.params.id,
      req.body,
      req.file,
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
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const isAdminRequest = req.user && req.user.user_type === "admin";
    const result = await bookService.searchBooks(
      q,
      !isAdminRequest,
      page,
      limit,
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
