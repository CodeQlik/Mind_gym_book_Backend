import bookService from "../services/book.service.js";
import sendResponse from "../utils/responseHandler.js";
import { validationResult } from "express-validator";
import { User, Book, BookPdfChunk } from "../models/index.js";
import fs from "fs";

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

    console.log("Create Book - Content-Type:", req.headers["content-type"]);
    console.log("Create Book - Body:", req.body);
    console.log("Create Book - Files:", req.files);
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

// Stream PDF endpoint
export const streamBookPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch book
    const book = await Book.findByPk(id);
    if (!book) return res.status(404).send("Book not found");

    // Check premium/subscription
    if (book.is_premium) {
      const user = await User.findByPk(req.user.id);
      const now = new Date();
      const isSubscriptionActive =
        user.subscription_status === "active" &&
        (!user.subscription_end_date || user.subscription_end_date >= now);

      if (!isSubscriptionActive) {
        return res.status(403).send("Subscription required");
      }
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${book.slug}.pdf"`);

    let offset = 0;
    const CHUNK_BATCH = 1; // Start quickly

    while (true) {
      // Fetch chunks in order
      const chunks = await BookPdfChunk.findAll({
        where: { book_id: id },
        order: [["chunk_index", "ASC"]],
        limit: CHUNK_BATCH,
        offset: offset,
        raw: true, // Get plain objects, avoid Sequelize instance overhead
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

export const readBookPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(req.user.id);
    const book = await Book.findByPk(id);

    if (!book) {
      return sendResponse(res, 404, false, "Book not found");
    }

    // Check if book is premium
    if (book.is_premium) {
      const now = new Date();
      const isSubscriptionActive =
        user.subscription_status === "active" &&
        (!user.subscription_end_date || user.subscription_end_date >= now);

      if (!isSubscriptionActive) {
        return res.status(403).json({
          success: false,
          message: "Please buy a subscription to read this book.",
          action: "REDIRECT_TO_PAYMENT",
        });
      }
    }

    // Success
    let pdfUrl = book.pdf_file?.url || "";

    // If chunked, construct local stream URL
    if (book.pdf_file?.is_chunked) {
      // Assuming the route will be /api/v1/books/stream/:id
      // We can get the host from req
      const protocol = req.protocol;
      const host = req.get("host");
      pdfUrl = `${protocol}://${host}/api/v1/books/stream/${book.id}`;
    }

    return sendResponse(res, 200, true, "Success", {
      pdf_url: pdfUrl,
      title: book.title,
    });
  } catch (error) {
    next(error);
  }
};
