import bookService from "../services/book.service.js";
import sendResponse from "../utils/responseHandler.js";

import {
  User,
  Book,
  BookPdfChunk,
  BookPage,
  Subscription,
  UserBook,
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

export const getBookPageContent = async (req, res) => {
  try {
    const { id, pageNumber } = req.params;

    const page = await BookPage.findOne({
      where: { book_id: id, page_number: pageNumber },
    });

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    const totalPages = await BookPage.count({
      where: { book_id: id },
    });

    res.status(200).json({
      success: true,
      data: page,
      totalPages: totalPages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const readBookPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.user_type;

    const book = await Book.findByPk(id);
    if (!book) return res.status(404).send("Book not found");

    let pageLimit = null;

    if (userType === "admin") {
      pageLimit = null;
    } else if (book.is_premium) {
      // Check individual book purchase
      const purchase = await UserBook.findOne({
        where: { user_id: userId, book_id: id },
      });

      if (!purchase) {
        const now = new Date();
        // Check if user has an active subscription (from req.user for speed)
        const hasActiveSubscription =
          req.user.subscription_status === "active" &&
          req.user.subscription_end_date &&
          new Date(req.user.subscription_end_date) >= now;

        if (!hasActiveSubscription) {
          pageLimit = 5;
          res.setHeader("X-Subscription-Required", "true");
        }
      }
    }

    // 3. Streaming Headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${book.slug}.pdf"`);

    let offset = 0;
    const CHUNK_BATCH = 10;

    while (true) {
      let whereClause = { book_id: id };

      if (pageLimit !== null) {
        whereClause.page_number = { [Op.lte]: pageLimit };
      }

      const chunks = await BookPdfChunk.findAll({
        where: whereClause,
        order: [["chunk_index", "ASC"]],
        limit: CHUNK_BATCH,
        offset: offset,
        raw: true,
      });

      if (!chunks || chunks.length === 0) break;

      for (const chunk of chunks) {
        if (chunk.data) {
          res.write(chunk.data);
        }
      }

      offset += chunks.length;
      if (chunks.length < CHUNK_BATCH) break;
    }

    res.end();
  } catch (error) {
    console.error("Error streaming PDF:", error);
    if (!res.headersSent) {
      res.status(500).send("Error streaming PDF");
    } else {
      res.end();
    }
  }
};
