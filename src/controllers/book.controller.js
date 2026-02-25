import bookService from "../services/book.service.js";
import sendResponse from "../utils/responseHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { Bookmark } from "../models/index.js";
import { Op } from "sequelize";
import rateLimit from "express-rate-limit";

// ULTRA PREMIUM: Rate limit for PDF streaming (10 requests per minute)
export const pdfLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many PDF requests. Please wait a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createBook = asyncHandler(async (req, res) => {
  const book = await bookService.createBook(req.body, req.files);

  // Return with a signed working URL
  //const pdfStatus = await bookService.getReadPdfUrl(book.id, req.user);

  return sendResponse(res, 201, true, "Book added successfully", {
    ...book.toJSON(),
    // pdf_url: pdfStatus.pdf_url,
  });
});

export const getAllBooks = asyncHandler(async (req, res) => {
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
});

// Admin: All books including inactive
export const getAdminBooks = asyncHandler(async (req, res) => {
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
});

export const getBookById = asyncHandler(async (req, res) => {
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
});

export const getBookBySlug = asyncHandler(async (req, res) => {
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
});

export const getBooksByCategory = asyncHandler(async (req, res) => {
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
});

export const updateBook = asyncHandler(async (req, res) => {
  const book = await bookService.updateBook(req.params.id, req.body, req.files);

  // Return with a signed working URL
  // const pdfStatus = await bookService.getReadPdfUrl(book.id, req.user);

  return sendResponse(res, 200, true, "Book updated successfully", {
    ...book.toJSON(),
    // pdf_url: pdfStatus.pdf_url,
  });
});

export const deleteBook = asyncHandler(async (req, res) => {
  await bookService.deleteBook(req.params.id);
  return sendResponse(res, 200, true, "Book deleted successfully");
});

export const toggleBookStatus = asyncHandler(async (req, res) => {
  const book = await bookService.toggleBookStatus(req.params.id);
  return sendResponse(
    res,
    200,
    true,
    `Book ${book.is_active ? "activated" : "deactivated"} successfully`,
    book,
  );
});

export const searchBooks = asyncHandler(async (req, res) => {
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
    return sendResponse(res, 200, true, "No books found matches your search", {
      books: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: page,
    });
  }
  return sendResponse(res, 200, true, "Search results fetched", result);
});

export const readBookPdf = asyncHandler(async (req, res) => {
  const result = await bookService.getReadPdfUrl(req.params.id, req.user);
  return res.json({
    success: true,
    ...result,
  });
});
