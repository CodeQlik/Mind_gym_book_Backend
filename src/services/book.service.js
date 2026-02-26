import { Op } from "sequelize";
import { Book, Category, User, UserBook } from "../models/index.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  cloudinary,
} from "../config/cloudinary.js";
import notificationService from "./notification.service.js";
import sequelize from "../config/db.js";

class BookService {
  generateSlug(title) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async createBook(data, files) {
    const {
      title,
      description,
      author,
      price,
      original_price,
      condition,
      stock,
      category_id,
      is_active,
      published_date,
      is_premium,
      is_bestselling,
      is_trending,
      highlights,
      isbn,
      language,
      otherdescription,
    } = data;

    // Validate category
    const category = await Category.findByPk(category_id);
    if (!category) throw new Error("Invalid category ID");

    const slug = this.generateSlug(title);
    const existingBook = await Book.findOne({ where: { slug } });
    if (existingBook)
      throw new Error("Book title already exists (slug conflict)");

    // Parallel Uploads Setup
    const uploadTasks = [];

    // Thumbnail
    let thumbnailPromise = null;
    if (files?.thumbnail?.[0]) {
      thumbnailPromise = uploadOnCloudinary(
        files.thumbnail[0].path,
        "mindgymbook/books/thumbnails",
      );
    }

    // Cover Image
    let coverImagePromise = null;
    if (files?.cover_image?.[0]) {
      coverImagePromise = uploadOnCloudinary(
        files.cover_image[0].path,
        "mindgymbook/books/covers",
      );
    }

    // PDF File
    let pdfFilePromise = null;
    if (files?.pdf_file?.[0]) {
      console.log(
        `[BOOK SERVICE] Attempting to upload PDF: ${files.pdf_file[0].originalname}, Path: ${files.pdf_file[0].path}, Size: ${files.pdf_file[0].size}`,
      );
      pdfFilePromise = uploadOnCloudinary(
        files.pdf_file[0].path,
        "mindgymbook/books/pdfs",
      );
    }

    // Gallery Images
    let galleryPromises = [];
    if (files?.images?.length > 0) {
      galleryPromises = files.images.map((file) =>
        uploadOnCloudinary(file.path, "mindgymbook/books/gallery"),
      );
    }

    // Wait for all uploads to finish
    await Promise.all([
      thumbnailPromise,
      coverImagePromise,
      pdfFilePromise,
      ...galleryPromises,
    ]);

    // Extract Results
    const thumbnailRes = thumbnailPromise ? await thumbnailPromise : null;
    const thumbnailData = thumbnailRes
      ? { url: thumbnailRes.secure_url, public_id: thumbnailRes.public_id }
      : { url: "", public_id: "" };

    const coverImageRes = coverImagePromise ? await coverImagePromise : null;
    const coverImageData = coverImageRes
      ? { url: coverImageRes.secure_url, public_id: coverImageRes.public_id }
      : { url: "", public_id: "" };

    const pdfFileRes = pdfFilePromise ? await pdfFilePromise : null;
    const pdfFileData = pdfFileRes
      ? { url: pdfFileRes.secure_url, public_id: pdfFileRes.public_id }
      : { url: "", public_id: "" };

    let extraImages = [];
    if (galleryPromises.length > 0) {
      const gResults = await Promise.all(galleryPromises);
      extraImages = gResults
        .filter((res) => res !== null)
        .map((res) => ({ url: res.secure_url, public_id: res.public_id }));
    }

    const book = await Book.create({
      title,
      slug,
      author,
      description,
      price: parseFloat(price) || 0,
      original_price: original_price ? parseFloat(original_price) : null,
      condition: condition || "good",
      stock: parseInt(stock) || 1,
      thumbnail: thumbnailData,
      cover_image: coverImageData,
      pdf_file: pdfFileData,
      images: extraImages,
      category_id,
      is_active: is_active !== undefined ? String(is_active) !== "false" : true,
      published_date: published_date || null,
      is_premium: String(is_premium) === "true",
      is_bestselling: String(is_bestselling) === "true",
      is_trending: String(is_trending) === "true",
      highlights: highlights || null,
      isbn: isbn || null,
      language: language || null,
      page_count: pdfFileRes?.pages || 0,
      otherdescription: otherdescription || null,
    });

    // Reload with category association
    const createdBook = await Book.findByPk(book.id, {
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });

    // Fire FCM notification (non-blocking)
    const categoryName =
      createdBook?.category?.name || "your favorite category";
    notificationService
      .notifyNewBookRelease(createdBook, categoryName)
      .catch((err) =>
        console.error("[FCM] Background notification error:", err.message),
      );

    return createdBook;
  }

  async getBooks(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.category_id) where.category_id = filters.category_id;
    if (filters.is_premium !== undefined) where.is_premium = filters.is_premium;
    if (filters.is_bestselling !== undefined)
      where.is_bestselling = filters.is_bestselling;
    if (filters.is_trending !== undefined)
      where.is_trending = filters.is_trending;

    const { count, rows } = await Book.findAndCountAll({
      where,
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      books: rows,
    };
  }

  async getBooksByCategoryId(
    category_id,
    activeOnly = true,
    page = 1,
    limit = 10,
  ) {
    const offset = (page - 1) * limit;
    const where = { category_id };
    if (activeOnly) where.is_active = true;

    const { count, rows } = await Book.findAndCountAll({
      where,
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      books: rows,
    };
  }

  async getBookBySlug(slug, activeOnly = true) {
    const where = { slug };
    if (activeOnly) where.is_active = true;

    const book = await Book.findOne({
      where,
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });
    if (!book) throw new Error("Book not found");
    return book;
  }

  async getBookById(id, activeOnly = true) {
    const where = { id };
    if (activeOnly) where.is_active = true;

    const book = await Book.findOne({
      where,
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });
    if (!book) throw new Error("Book not found");
    return book;
  }

  async toggleBookStatus(id) {
    const book = await Book.findByPk(id);
    if (!book) throw new Error("Book not found");

    book.is_active = !book.is_active;
    await book.save();
    return book;
  }

  async updateBook(id, data, files) {
    const book = await Book.findByPk(id);

    if (!book) throw new Error("Book not found");

    // Handle title/slug change
    if (data.title && data.title !== book.title) {
      const newSlug = this.generateSlug(data.title);
      const existingBook = await Book.findOne({
        where: { slug: newSlug, id: { [Op.ne]: id } },
      });
      if (existingBook)
        throw new Error("Another book already exists with this title");
      book.title = data.title;
      book.slug = newSlug;
    }

    // Validate category
    if (data.category_id) {
      const cat = await Category.findByPk(data.category_id);
      if (!cat) throw new Error("Invalid category ID");
      book.category_id = data.category_id;
    }

    // Handle thumbnail upload
    if (files?.thumbnail?.[0]) {
      const uploadResult = await uploadOnCloudinary(
        files.thumbnail[0].path,
        "mindgymbook/books/thumbnails",
      );
      if (!uploadResult) throw new Error("Failed to upload updated thumbnail");

      // Delete old only after new succeeds
      const oldThumb = book.thumbnail;
      if (oldThumb?.public_id) await deleteFromCloudinary(oldThumb.public_id);

      book.thumbnail = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    // Handle cover image upload
    if (files?.cover_image?.[0]) {
      const uploadResult = await uploadOnCloudinary(
        files.cover_image[0].path,
        "mindgymbook/books/covers",
      );
      if (!uploadResult)
        throw new Error("Failed to upload updated cover image");

      const oldCover = book.cover_image;
      if (oldCover?.public_id) await deleteFromCloudinary(oldCover.public_id);

      book.cover_image = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    // Handle PDF upload
    if (files?.pdf_file?.[0]) {
      const uploadResult = await uploadOnCloudinary(
        files.pdf_file[0].path,
        "mindgymbook/books/pdfs",
      );

      if (!uploadResult)
        throw new Error(
          "Failed to upload updated PDF to Cloudinary. Check logs for details.",
        );

      const oldPdf = book.pdf_file;
      if (oldPdf?.public_id) await deleteFromCloudinary(oldPdf.public_id);

      book.pdf_file = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
      book.page_count = uploadResult.pages || 0;
    }

    // Handle gallery images
    if (files?.images?.length > 0) {
      const extraImages = [];
      const uploadPromises = files.images.map((file) =>
        uploadOnCloudinary(file.path, "mindgymbook/books/gallery"),
      );
      const results = await Promise.all(uploadPromises);

      results.forEach((res) => {
        if (res) {
          extraImages.push({
            url: res.secure_url,
            public_id: res.public_id,
          });
        }
      });

      if (extraImages.length > 0) {
        // Delete old ONLY if we have new ones
        const oldImages = book.images;
        if (Array.isArray(oldImages)) {
          for (const img of oldImages) {
            if (img.public_id) await deleteFromCloudinary(img.public_id);
          }
        }
        book.images = extraImages;
      }
    }

    // Scalar fields
    const scalarFields = [
      "description",
      "author",
      "price",
      "original_price",
      "condition",
      "stock",
      "published_date",
      "isbn",
      "language",
      "highlights",
      "otherdescription",
    ];
    scalarFields.forEach((field) => {
      if (data[field] !== undefined) book[field] = data[field];
    });

    // Boolean fields
    if (data.is_active !== undefined)
      book.is_active = data.is_active !== "false";
    if (data.is_premium !== undefined)
      book.is_premium = String(data.is_premium) === "true";
    if (data.is_bestselling !== undefined)
      book.is_bestselling = String(data.is_bestselling) === "true";
    if (data.is_trending !== undefined)
      book.is_trending = String(data.is_trending) === "true";

    await book.save();

    // Reload with category association
    return await Book.findByPk(book.id, {
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });
  }

  async deleteBook(id) {
    const book = await Book.findByPk(id);
    if (!book) throw new Error("Book not found");

    const thumbnail = book.thumbnail;
    if (thumbnail?.public_id) await deleteFromCloudinary(thumbnail.public_id);

    await book.destroy();
    return true;
  }

  async searchBooks(
    query,
    activeOnly = true,
    page = 1,
    limit = 10,
    status = "",
  ) {
    const offset = (page - 1) * limit;
    const searchTerm = `%${query}%`;

    const where = {
      [Op.or]: [
        { title: { [Op.like]: searchTerm } },
        { author: { [Op.like]: searchTerm } },
        { description: { [Op.like]: searchTerm } },
        { otherdescription: { [Op.like]: searchTerm } },
        { isbn: { [Op.like]: searchTerm } },
      ],
    };

    if (status === "active") where.is_active = true;
    else if (status === "inactive") where.is_active = false;
    else if (activeOnly) where.is_active = true;

    const { count, rows } = await Book.findAndCountAll({
      where,
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      books: rows,
    };
  }
  async getReadPdfUrl(bookId, user) {
    const userId = user?.id;
    const userType = user?.user_type;

    const book = await Book.findByPk(bookId);

    if (!book) throw new Error("Book not found");
    if (!book.pdf_file || !book.pdf_file.url) throw new Error("PDF not found");

    // 🔄 SELF-HEALING: If page_count is 0, sync it from Cloudinary now
    if (!book.page_count || book.page_count === 0) {
      try {
        const tempUrl = book.pdf_file.url;
        const tempIsRaw = tempUrl.includes("/raw/");
        const tempCleanId = tempIsRaw
          ? book.pdf_file.public_id
          : book.pdf_file.public_id.replace(/\.pdf$/i, "").replace(/^\//, "");

        console.log(
          `[BOOK SERVICE] Syncing page_count for Book ${bookId} using ID: ${tempCleanId}...`,
        );

        const details = await cloudinary.api.resource(tempCleanId, {
          resource_type: tempIsRaw ? "raw" : "image",
          pages: true,
        });

        if (details && details.pages) {
          book.page_count = details.pages;
          await book.save();
          console.log(
            `[BOOK SERVICE] Successfully synced page_count DB updated to: ${details.pages}`,
          );
        }
      } catch (err) {
        console.warn(
          "[BOOK SERVICE] Could not auto-sync pages for old book:",
          err.message,
        );
      }
    }

    // 🔐 1. Access Control Logic
    let hasAccess = false;
    if (userType === "admin") {
      hasAccess = true;
    } else if (book.is_premium === false) {
      hasAccess = true;
    } else if (userId) {
      const purchase = await UserBook.findOne({
        where: { user_id: userId, book_id: bookId },
      });
      if (purchase) {
        hasAccess = true;
      } else {
        const dbUser = await User.findByPk(userId);
        const now = new Date();
        if (
          dbUser?.subscription_status === "active" &&
          new Date(dbUser.subscription_end_date) >= now
        ) {
          hasAccess = true;
        }
      }
    }

    console.log(
      `[BOOK SERVICE] Auth: ${userId || "Guest"}, Premium: ${book.is_premium}, Access: ${hasAccess}`,
    );

    // 📄 2. Cloudinary Variables
    const originalUrl = book.pdf_file.url;
    let publicId = book.pdf_file.public_id;

    // Extract version and type from URL
    const isRaw = originalUrl.includes("/raw/");
    const isPrivate = originalUrl.includes("/private/");
    const isAuth = originalUrl.includes("/authenticated/");

    const versionMatch = originalUrl.match(/\/v(\d+)\//);
    const version = versionMatch ? versionMatch[1] : undefined;

    // 🛠️ 3. Fix: Consistent standard for PDFs
    const isRestricted = isPrivate || isAuth || isRaw;
    const cleanPublicId = isRaw
      ? publicId
      : publicId.replace(/\.pdf$/i, "").replace(/^\//, "");

    let finalUrl;

    try {
      const deliveryType = isPrivate
        ? "private"
        : isAuth
          ? "authenticated"
          : "upload";

      if (hasAccess) {
        // ✅ 1. FULL ACCESS: Stable signed URL for download/view
        finalUrl = cloudinary.utils.private_download_url(cleanPublicId, "pdf", {
          resource_type: isRaw ? "raw" : "image",
          type: deliveryType,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          attachment: false,
        });
      } else {
        // 🔒 2. PREVIEW ACCESS: Restricted to 1-5 pages
        // Using a highly specific signature format that Cloudinary expects for restricted transformations
        finalUrl = cloudinary.url(cleanPublicId, {
          resource_type: "image",
          type: deliveryType,
          secure: true,
          sign_url: true,
          version: version,
          format: "pdf",
          transformation: [{ page: "1-5" }],
        });

        // Final fallback: If signature still picky, we remove version from signature calculation
        if (!finalUrl.includes("s--")) {
          finalUrl = cloudinary.url(cleanPublicId, {
            resource_type: "image",
            type: deliveryType,
            secure: true,
            sign_url: true,
            transformation: [{ page: "1-5" }],
            format: "pdf",
          });
        }
      }

      console.log(`[BOOK SERVICE] Result URL: ${finalUrl}`);
    } catch (err) {
      console.error("[BOOK SERVICE] URL Generation Error:", err.message);
      finalUrl = originalUrl;
    }

    return {
      pdf_url: finalUrl || originalUrl,
      isPreview: !hasAccess,
      total_pages: book.page_count || 0,
    };
  }
}

export default new BookService();
