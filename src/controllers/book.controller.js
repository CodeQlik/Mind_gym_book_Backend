import bookService from "../services/book.service.js";
import pdfService from "../services/pdf.service.js";
import sendResponse from "../utils/responseHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { Bookmark, Book } from "../models/index.js";
import { Op } from "sequelize";
import rateLimit from "express-rate-limit";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";

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

  return sendResponse(res, 201, true, "Book added successfully", {
    ...book.toJSON(),
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

  const baseUrl =
    process.env.BASE_URL || "https://mindgymbook.ductfabrication.in";
  const booksWithReadUrl = result.books.map((book) => {
    const bookData = typeof book.toJSON === "function" ? book.toJSON() : book;
    return {
      ...bookData,
      read_url: `${baseUrl}/api/v1/book/readBook/${bookData.id}`,
    };
  });

  return sendResponse(res, 200, true, "Books fetched successfully", {
    ...result,
    books: booksWithReadUrl,
  });
});

// Admin: All books including inactive
export const getAdminBooks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await bookService.getBooks({}, page, limit);

  const baseUrl =
    process.env.BASE_URL || "https://mindgymbook.ductfabrication.in";
  const booksWithReadUrl = result.books.map((book) => {
    const bookData = typeof book.toJSON === "function" ? book.toJSON() : book;
    return {
      ...bookData,
      read_url: `${baseUrl}/api/v1/book/readBook/${bookData.id}`,
    };
  });

  return sendResponse(res, 200, true, "Admin books fetched successfully", {
    ...result,
    books: booksWithReadUrl,
  });
});

export const getBookById = asyncHandler(async (req, res) => {
  const isAdminRequest = req.user && req.user.user_type === "admin";
  const book = await bookService.getBookById(req.params.id, !isAdminRequest);

  let isBookmarked = false;
  if (req.user) {
    const bookmark = await Bookmark.findOne({
      where: { user_id: req.user.id, book_id: book.id },
    });
    isBookmarked = !!bookmark;
  }

  const baseUrl =
    process.env.BASE_URL || "https://mindgymbook.ductfabrication.in";
  const read_url = `${baseUrl}/api/v1/book/readBook/${book.id}`;

  const bookData = typeof book.toJSON === "function" ? book.toJSON() : book;
  return sendResponse(res, 200, true, "Book fetched successfully", {
    ...bookData,
    isBookmarked,
    read_url,
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

  const baseUrl =
    process.env.BASE_URL || "https://mindgymbook.ductfabrication.in";
  const read_url = `${baseUrl}/api/v1/book/readBook/${book.id}`;

  const bookData = typeof book.toJSON === "function" ? book.toJSON() : book;
  return sendResponse(res, 200, true, "Book fetched successfully", {
    ...bookData,
    isBookmarked,
    read_url,
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

  const baseUrl =
    process.env.BASE_URL || "https://mindgymbook.ductfabrication.in";
  const booksWithReadUrl = result.books.map((book) => {
    const bookData = typeof book.toJSON === "function" ? book.toJSON() : book;
    return {
      ...bookData,
      read_url: `${baseUrl}/api/v1/book/readBook/${bookData.id}`,
    };
  });

  return sendResponse(res, 200, true, "Category books fetched successfully", {
    ...result,
    books: booksWithReadUrl,
  });
});

export const updateBook = asyncHandler(async (req, res) => {
  const book = await bookService.updateBook(req.params.id, req.body, req.files);

  const bookData = typeof book.toJSON === "function" ? book.toJSON() : book;
  return sendResponse(res, 200, true, "Book updated successfully", {
    ...bookData,
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

  const baseUrl =
    process.env.BASE_URL || "https://mindgymbook.ductfabrication.in";
  const booksWithReadUrl = result.books.map((book) => {
    const bookData = typeof book.toJSON === "function" ? book.toJSON() : book;
    return {
      ...bookData,
      read_url: `${baseUrl}/api/v1/book/readBook/${bookData.id}`,
    };
  });

  return sendResponse(res, 200, true, "Search results fetched", {
    ...result,
    books: booksWithReadUrl,
  });
});

export const readBookPdf = asyncHandler(async (req, res) => {
  const { id: bookId } = req.params;
  const user = req.user;

  const book = await Book.findByPk(bookId);
  if (!book) return res.status(404).json({ message: "Book nahi mili" });

  const fileInfo = book.file_data;

  // No file attached to this book
  if (!fileInfo?.url) {
    return res.status(404).json({ message: "Is book ka koi file nahi hai" });
  }

  const fullAccess = await bookService.hasFullAccess(user, book);
  const fileType = fileInfo.type || "pdf"; // default pdf for older records

  // ─── EPUB Handling
  if (fileType === "epub") {
    if (!fullAccess) {
      try {
        const previewText = await pdfService.extractTextFromEpubUrl(
          fileInfo.url,
          bookId,
          book,
          book.previewPages || 5, // preview pages/chapters free
        );
        return res.status(200).json({
          success: true,
          message: "Is book ko padhne ke liye subscription zaruri hai ",
          isPreview: true,
          file_type: "epub",
          data: previewText,
        });
      } catch (error) {
        return res.status(500).json({
          message: "EPUB preview generate karne mein error hua",
          error: error.message,
        });
      }
    }
    // EPUB ke liye Signed Cloudinary URL generate karo agar possible ho
    let finalUrl = fileInfo.url;
    if (fileInfo.url.includes("cloudinary.com") && fileInfo.public_id) {
      try {
        finalUrl = pdfService.getSignedCloudinaryUrl(fileInfo.public_id);
      } catch (e) {
        console.warn("EPUB URL sign nahi ho payi:", e.message);
      }
    }
    res.setHeader("X-File-Type", "epub");
    res.setHeader("X-Is-Preview", "false");
    return res.redirect(finalUrl);
  }

  // ─── PDF Handling ─────────────────────────────────────────────────────────────
  let existingPdfBytes;
  try {
    existingPdfBytes = await pdfService.getPdfBuffer(fileInfo.url, book);
  } catch (error) {
    console.error("PDF Fetch Error:", error.message);
    return res.status(500).json({
      message: "PDF file fetch karne mein error hua",
      error: error.message,
    });
  }

  if (!existingPdfBytes) {
    return res
      .status(404)
      .json({ message: "PDF file kahi nahi mili (Local/Cloud)" });
  }

  // Full Access → Poori PDF
  if (fullAccess) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Is-Preview", "false");
    res.setHeader("X-File-Type", "pdf");
    return res.send(Buffer.from(existingPdfBytes));
  }

  // Preview Mode → Sirf kuch pages
  try {
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const previewDoc = await PDFDocument.create();

    const pagesToCopyCount = Math.min(
      book.previewPages || 5,
      pdfDoc.getPageCount(),
    );
    const indices = Array.from({ length: pagesToCopyCount }, (_, i) => i);

    const copiedPages = await previewDoc.copyPages(pdfDoc, indices);
    copiedPages.forEach((page) => previewDoc.addPage(page));

    const previewBytes = await previewDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${book.title}.pdf"`,
    );
    res.setHeader("X-Is-Preview", "true");
    res.setHeader("X-File-Type", "pdf");
    return res.send(Buffer.from(previewBytes));
  } catch (pdfError) {
    console.error("PDF Processing Error:", pdfError);
    return res.status(500).json({ message: "Error generating preview" });
  }
});

export const extractBookText = asyncHandler(async (req, res) => {
  const { id: bookId } = req.params;

  const book = await Book.findByPk(bookId);
  if (!book) {
    return sendResponse(res, 404, false, "Book nahi mili.");
  }

  const fileData = book.file_data;
  if (!fileData?.url) {
    return sendResponse(res, 400, false, "Is book ki koi file nahi hai.");
  }

  const user = req.user;
  const fullAccess = await bookService.hasFullAccess(user, book);
  const isPreview = !fullAccess;
  const maxPages = isPreview ? book.previewPages || 5 : null;

  try {
    let text;
    if (fileData.type === "epub") {
      text = await pdfService.extractTextFromEpubUrl(
        fileData.url,
        bookId,
        book,
        maxPages,
      );
    } else {
      text = await pdfService.extractTextFromPdfUrl(
        fileData.url,
        bookId,
        book,
        maxPages,
      );
    }

    return sendResponse(
      res,
      200,
      true,
      isPreview
        ? "Is book ko padhne ke liye subscription zaruri hai "
        : "Text extracted successfully for TTS.",
      {
        book_id: bookId,
        title: book.title,
        file_type: fileData.type || "pdf",
        isPreview,
        text,
      },
    );
  } catch (error) {
    console.error("Text Extraction Error:", error.message);
    return sendResponse(res, 500, false, "Text extract karne mein error hua.", {
      error: error.message,
    });
  }
});

export const extractBookPageText = asyncHandler(async (req, res) => {
  const { id: bookId, page_number } = req.params;
  const pageNum = parseInt(page_number);

  const book = await Book.findByPk(bookId);
  if (!book) {
    return sendResponse(res, 404, false, "Book nahi mili.");
  }

  const fileData = book.file_data;
  if (!fileData?.url) {
    return sendResponse(res, 400, false, "Is book ki koi file nahi hai.");
  }

  const user = req.user;
  // ── Access Control: Use unified service logic ───
  const fullAccess = await bookService.hasFullAccess(user, book);
  const FREE_LIMIT = book.previewPages || 5;

  if (!fullAccess && pageNum > FREE_LIMIT) {
    const fileType = fileData.type || "pdf";
    return sendResponse(
      res,
      403,
      false,
      "Is book ko padhne ke liye subscription zaruri hai ",
      {
        requires_subscription: true,
        file_type: fileType,
        free_pages: FREE_LIMIT,
      },
    );
  }

  try {
    let result;
    if (fileData.type === "epub") {
      result = await pdfService.extractPageTextFromEpubUrl(
        fileData.url,
        bookId,
        pageNum,
        book,
      );
    } else {
      result = await pdfService.extractPageTextFromPdfUrl(
        fileData.url,
        bookId,
        pageNum,
        book,
      );
    }

    return sendResponse(
      res,
      200,
      true,
      `Page/Chapter ${pageNum} text extracted successfully.`,
      {
        id: bookId,
        book_id: bookId,
        file_type: fileData.type || "pdf",
        page_number: pageNum,
        total_pages: result.total_pages,
        text_content: result.text_content,
      },
    );
  } catch (error) {
    console.error("Page Text Extraction Controller Error:", error.message);
    return sendResponse(
      res,
      500,
      false,
      "Page text extract karne mein error hua.",
      {
        error: error.message,
      },
    );
  }
});
