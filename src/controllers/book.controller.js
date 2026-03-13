import bookService from "../services/book.service.js";
import pdfService from "../services/pdf.service.js";
import sendResponse from "../utils/responseHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { clearCachePattern } from "../utils/redisCache.js";

import { Bookmark, Book, UserBook, User, Audiobook } from "../models/index.js";
import { Op } from "sequelize";
import rateLimit from "express-rate-limit";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { encryptId, decryptId } from "../utils/cryptoUtils.js";


const getCleanBaseUrl = () => {
  return process.env.BASE_URL.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
};

const cleanBookData = (
  book,
  isAdminRequest = false,
  includeAudio = true,
  includeFiles = true,
) => {
  const data = typeof book.toJSON === "function" ? book.toJSON() : { ...book };

  // Transform to the requested Premium Format with SPECIFIC ORDER
  const cleaned = {
    id: data.id,
    title: data.title,
    slug: data.slug,
    author: data.author,
    price: data.price ? parseFloat(data.price).toFixed(2) : "0.00",
    description: data.description || "",
    highlights: data.highlights || "",
    language: data.language || "Hindi",
    category: data.category
      ? { id: data.category.id, name: data.category.name }
      : null,
    images: data.images || [],
  };

  // 1. Handle Audio Book structure (Middle)
  if (
    includeAudio &&
    Array.isArray(data.audiobooks) &&
    data.audiobooks.length > 0
  ) {
    const baseUrl = getCleanBaseUrl();
    cleaned.audio_book = {
      available: true,
      chapters: data.audiobooks.map((chapter) => ({
        title: chapter.chapter_title || `Chapter ${chapter.chapter_number}`,
        audio_url:
          chapter.audio_file && chapter.audio_file.url
            ? `${baseUrl}/api/v1/audiobook/stream/${encryptId(chapter.id)}`
            : "",
        is_encrypted: true,
      })),
    };

  }

  // 2. Heavy fields at the BOTTOM
  cleaned.cover_image =
    data.cover_image === 0 || data.cover_image === "0"
      ? null
      : data.cover_image;
  cleaned.thumbnail =
    data.thumbnail === 0 || data.thumbnail === "0" ? null : data.thumbnail;

  // Handle File Data (PDF/EPUB) last
  if (includeFiles) {
    cleaned.file_data = { pdf: null, epub: null };
    if (data.file_data) {
      const original = data.file_data;
      if (original.url) {
        const type =
          original.type ||
          (original.url.toLowerCase().includes(".epub") ? "epub" : "pdf");
        const fileObj = {
          url: original.url,
          type: type,
        };
        if (type === "pdf") cleaned.file_data.pdf = fileObj;
        else cleaned.file_data.epub = fileObj;
      } else {
        ["pdf", "epub"].forEach((type) => {
          if (original[type]) {
            const inner =
              typeof original[type] === "string"
                ? JSON.parse(original[type])
                : original[type];
            if (inner && inner.url) {
              cleaned.file_data[type] = {
                url: inner.url,
                type: type,
              };
            }
          }
        });
      }
    }
  }

  // Preserve all fields and admin-only fields if necessary
  if (isAdminRequest) {
    return {
      ...data,
      ...cleaned,
      is_active: data.is_active,
      stock: data.stock,
      reserved: data.reserved,
      available: data.available, // Maintain virtuals if any
    };
  }

  return cleaned;
};

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
    ...cleanBookData(book, true), // Admin has always access
  });
});

export const getAllBooks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const status = req.query.status;

  const isAdminRequest = req.user && req.user.user_type === "admin";
  let filters = isAdminRequest ? {} : { is_active: true };

  if (status && isAdminRequest) {
    if (status === "active") filters.is_active = true;
    if (status === "inactive") filters.is_active = false;
  }

  const result = await bookService.getBooks(filters, page, limit);

  // Fetch user access info once to avoid N+1 queries
  const user = req.user;
  const isAdmin = user && user.user_type === "admin";
  const isSubscribed =
    user &&
    user.subscription_status === "active" &&
    new Date(user.subscription_end_date) >= new Date();

  let purchasedBookIds = new Set();
  if (user && !isSubscribed && !isAdmin) {
    const purchases = await UserBook.findAll({
      where: { user_id: user.id },
      attributes: ["book_id"],
    });
    purchasedBookIds = new Set(purchases.map((p) => p.book_id));
  }

  const categories = result.categories || [];
  const books = {};

  categories.forEach((cat) => {
    const categoryData = cat.toJSON ? cat.toJSON() : cat;
    const catName = categoryData.name || "Unknown";

    const cleanedBooks = (categoryData.books || []).map((book) => {
      // Inject category data so cleanBookData can find it
      const bookData = book.toJSON ? book.toJSON() : { ...book };
      bookData.category = { id: categoryData.id, name: categoryData.name };
      return cleanBookData(bookData, isAdmin, false, false);
    });

    books[catName] = cleanedBooks;
  });

  // Clear cache for books to reflect changes immediately
  await clearCachePattern("books:*");

  return sendResponse(res, 200, true, "Books fetched successfully", {
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    books,
  });
});

// Admin: All books including inactive
export const getAdminBooks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  const result = await bookService.getBooks({}, page, limit, false);

  const cleanBooks = (result.books || []).map((book) =>
    cleanBookData(book, true, true, true),
  );

  return sendResponse(res, 200, true, "Admin books fetched successfully", {
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    books: cleanBooks,
  });
});

export const getBookById = asyncHandler(async (req, res) => {
  const userRole = (req.user?.user_type || "").toLowerCase();
  const isAdminRequest = ["admin", "system admin", "master admin"].includes(userRole);
  const book = await bookService.getBookById(req.params.id, !isAdminRequest);

  let isBookmarked = false;
  if (req.user) {
    const bookmark = await Bookmark.findOne({
      where: { user_id: req.user.id, book_id: book.id },
    });
    isBookmarked = !!bookmark;
  }

  const bookData = cleanBookData(book, isAdminRequest, false, false);

  return sendResponse(res, 200, true, "Book fetched successfully", {
    ...bookData,
    isBookmarked,
  });
});

export const getBookBySlug = asyncHandler(async (req, res) => {
  const userRole = (req.user?.user_type || "").toLowerCase();
  const isAdminRequest = ["admin", "system admin", "master admin"].includes(userRole);
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

  const bookData = cleanBookData(
    book,
    isAdminRequest,
    isAdminRequest,
    isAdminRequest,
  );
  return sendResponse(res, 200, true, "Book fetched successfully", {
    ...bookData,
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

  // Fetch user access info once to avoid N+1 queries
  const user = req.user;
  const isAdmin = user && user.user_type === "admin";
  const isSubscribed =
    user &&
    user.subscription_status === "active" &&
    new Date(user.subscription_end_date) >= new Date();

  let purchasedBookIds = new Set();
  if (user && !isSubscribed && !isAdmin) {
    const purchases = await UserBook.findAll({
      where: { user_id: user.id },
      attributes: ["book_id"],
    });
    purchasedBookIds = new Set(purchases.map((p) => p.book_id));
  }

  const cleanBooks = result.books.map((book) => cleanBookData(book, isAdmin));

  return sendResponse(res, 200, true, "Category books fetched successfully", {
    ...result,
    books: cleanBooks,
  });
});

export const updateBook = asyncHandler(async (req, res) => {
  const book = await bookService.updateBook(req.params.id, req.body, req.files);

  const bookData = cleanBookData(book, true); // Admin has access
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
    cleanBookData(book, true), // Admin has access
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

  // Fetch user access info once to avoid N+1 queries
  const user = req.user;
  const isAdmin = user && user.user_type === "admin";
  const isSubscribed =
    user &&
    user.subscription_status === "active" &&
    new Date(user.subscription_end_date) >= new Date();

  let purchasedBookIds = new Set();
  if (user && !isSubscribed && !isAdmin) {
    const purchases = await UserBook.findAll({
      where: { user_id: user.id },
      attributes: ["book_id"],
    });
    purchasedBookIds = new Set(purchases.map((p) => p.book_id));
  }

  const cleanBooks = result.books.map((book) => cleanBookData(book, isAdmin));

  return sendResponse(res, 200, true, "Search results fetched", {
    ...result,
    books: cleanBooks,
  });
});

export const readBookPdf = asyncHandler(async (req, res) => {
  const { id: encryptedId } = req.params;
  const bookId = decryptId(encryptedId);
  const user = req.user;

  const book = await Book.findByPk(bookId);

  if (!book) return res.status(404).json({ message: "Book nahi mili" });

  const fileInfo = book.file_data;

  // No file attached to this book
  if (!fileInfo?.url) {
    return res.status(404).json({ message: "Is book ka koi file nahi hai" });
  }

  const fullAccess = await bookService.hasFullAccess(user, book);

  // If user has full access and is logged in, increment the read count if it's a new book
  if (fullAccess && user) {
    await bookService.incrementBookReadCount(user.id, book.id);
  }

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
        finalUrl = pdfService.getSignedCloudinaryUrl(
          fileInfo.public_id,
          null,
          fileInfo.asset_type || "upload",
        );
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

  // If user has full access and is logged in, increment the read count if it's a new book
  if (fullAccess && user) {
    await bookService.incrementBookReadCount(user.id, book.id);
  }

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

  // If user has full access and is logged in, increment the read count if it's a new book
  if (fullAccess && user) {
    await bookService.incrementBookReadCount(user.id, book.id);
  }

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
export const getBookContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const book = await bookService.getBookById(id, true);
  if (!book) {
    return sendResponse(res, 404, false, "Book not found");
  }

  // Check if user has full access (Subscription or Purchase)
  const fullAccess = await bookService.hasFullAccess(user, book);
  const baseUrl = getCleanBaseUrl();

  // Map audio chapters
  const audioChapters = (book.audiobooks || []).map((ch) => {
    let audioUrl = "";
    if (ch.audio_file && ch.audio_file.url) {
      if (fullAccess) {
        // Enforce full direct link for subscribed/purchased users
        audioUrl = ch.audio_file.url;
      } else {
        // Enforce 30-second preview via internal stream endpoint
        audioUrl = `${baseUrl}/api/v1/audiobook/stream/${encryptId(ch.id)}`;
      }

    }

    return {
      chapter_number: ch.chapter_number,
      chapter_title: ch.chapter_title || `Chapter ${ch.chapter_number}`,
      audio_url: audioUrl,
      is_preview: !fullAccess,
    };
  });

  // Get file data
  let fileUrl = null;
  let fileType = null;

  if (book.file_data) {
    const fd =
      typeof book.file_data === "string"
        ? JSON.parse(book.file_data)
        : book.file_data;

    // Determine the raw source URL
    let sourceUrl = "";
    if (fd.epub && fd.epub.url) {
      sourceUrl = fd.epub.url;
      fileType = "epub";
    } else if (fd.pdf && fd.pdf.url) {
      sourceUrl = fd.pdf.url;
      fileType = "pdf";
    } else if (fd.url) {
      sourceUrl = fd.url;
      fileType =
        fd.type || (fd.url.toLowerCase().includes(".epub") ? "epub" : "pdf");
    }

    if (sourceUrl) {
      if (fullAccess) {
        fileUrl = sourceUrl;
      } else {
        // Enforce 5-page preview via internal read endpoint
        fileUrl = `${baseUrl}/api/v1/book/readBook/${encryptId(id)}`;
      }

    }
  }

  if (!fileUrl) {
    return sendResponse(res, 404, false, "Book file content not found");
  }

  return sendResponse(res, 200, true, "Book content fetched successfully", {
    book_id: parseInt(id),
    file_url: fileUrl,
    file_type: fileType,
    is_preview: !fullAccess,
    audio_chapters: audioChapters,
  });
});
