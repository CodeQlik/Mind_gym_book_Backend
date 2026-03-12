import { Op } from "sequelize";
import path from "path";
import { Book, Category, User, UserBook, Subscription, Plan, ReadingProgress } from "../models/index.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../config/cloudinary.js";
import notificationService from "./notification.service.js";
import sequelize from "../config/db.js";
import { getCache, setCache, clearCachePattern } from "../utils/redisCache.js";

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
      previewPages,
      dimensions,
      weight,
    } = data;

    // Smart routing for 'book_file'
    if (files?.book_file?.[0]) {
      const file = files.book_file[0];
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === ".pdf") {
        if (!files.pdf_file) files.pdf_file = [file];
      } else if (ext === ".epub") {
        if (!files.epub_file) files.epub_file = [file];
      }
    }

    // Validate category
    const category = await Category.findByPk(category_id);
    if (!category) throw new Error("Invalid category ID");

    const slug = this.generateSlug(title);
    const existingBook = await Book.findOne({ where: { slug } });
    if (existingBook)
      throw new Error("Book title already exists (slug conflict)");

    const uploadFiles = async (fileArray, folder) => {
      if (!fileArray || fileArray.length === 0) return null;
      const res = await uploadOnCloudinary(fileArray[0].path, folder);
      return res
        ? {
            url: res.secure_url,
            public_id: res.public_id,
            local_path: fileArray[0].path,
          }
        : null;
    };

    const uploadBookFile = async () => {
      const bookFileInput = files?.pdf_file?.[0] || files?.epub_file?.[0];
      if (!bookFileInput) return null;
      const ext = path
        .extname(bookFileInput.originalname)
        .toLowerCase()
        .replace(".", "");
      const folder =
        ext === "pdf" ? "mindgymbook/books/pdf" : "mindgymbook/books/epub";
      const res = await uploadOnCloudinary(bookFileInput.path, folder);
      if (res) {
        return {
          url: res.secure_url,
          public_id: res.public_id,
          type: ext,
          asset_type: res.type || "upload",
          local_path: bookFileInput.path,
        };
      }
      return null;
    };

    const uploadAudioFile = async () => {
      if (!files?.audio_file?.[0]) return null;
      const audioFile = files.audio_file[0];
      const res = await uploadOnCloudinary(audioFile.path, "mindgymbook/books/audio");
      if (res) {
        return {
          url: res.secure_url,
          public_id: res.public_id,
          asset_type: res.type || "upload",
          local_path: audioFile.path,
        };
      }
      return null;
    };

    const uploadExtraImages = async () => {
      let images = [];
      if (files?.images?.length > 0) {
        const promises = files.images.map(async (file) => {
          const res = await uploadOnCloudinary(file.path, "mindgymbook/books/gallery");
          if (res) return { url: res.secure_url, public_id: res.public_id };
          return null;
        });
        const results = await Promise.all(promises);
        images = results.filter(Boolean);
      }
      return images;
    };

    // Parallelize all uploads to significantly reduce response time
    const [thumbnailData, coverImageData, bookFileData, audioFileData, extraImages] = await Promise.all([
      uploadFiles(files?.thumbnail, "mindgymbook/books/thumbnails"),
      uploadFiles(files?.cover_image, "mindgymbook/books/covers"),
      uploadBookFile(),
      uploadAudioFile(),
      uploadExtraImages(),
    ]);

    // ✅ Validation: At least one format (Digital or Audio) should be available
    if (!bookFileData && !audioFileData) {
      throw new Error(
        "Please upload at least a book file (PDF/EPUB) or an audio file.",
      );
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
      thumbnail: thumbnailData || { url: "", public_id: "" },
      cover_image: coverImageData || { url: "", public_id: "" },
      file_data: bookFileData,
      audio_file: audioFileData,
      images: extraImages,
      category_id,
      is_active:
        is_active === undefined
          ? true
          : is_active === "true" || is_active === true,
      published_date: published_date || null,
      is_premium: is_premium === "true" || is_premium === true,
      is_bestselling: is_bestselling === "true" || is_bestselling === true,
      is_trending: is_trending === "true" || is_trending === true,
      highlights: highlights || null,
      isbn: isbn || null,
      language: language || null,
      page_count: 0,
      previewPages: parseInt(previewPages) || 5,
      dimensions: dimensions || null,
      weight: parseFloat(weight) || null,
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

    // Clear books cache
    await clearCachePattern("books:*");

    return createdBook;
  }

  async getBooks(filters = {}, page = 1, limit = 50) {
    const cacheKey = `books:list:${JSON.stringify(filters)}:${page}:${limit}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) return cachedData;

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

    const result = {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      books: rows,
    };

    await setCache(cacheKey, result);
    return result;
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

    // Smart routing for 'book_file'
    if (files?.book_file?.[0]) {
      const file = files.book_file[0];
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === ".pdf") {
        if (!files.pdf_file) files.pdf_file = [file];
      } else if (ext === ".epub") {
        if (!files.epub_file) files.epub_file = [file];
      }
    }

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

    // Concurrent File Upload Tasks
    const updateThumbnail = async () => {
      if (files?.thumbnail?.[0]) {
        if (book.thumbnail?.public_id) {
          deleteFromCloudinary(book.thumbnail.public_id).catch(()=>console.warn("Could not delete old thumbnail"));
        }
        const res = await uploadOnCloudinary(files.thumbnail[0].path, "mindgymbook/books/thumbnails");
        if (res) {
          book.thumbnail = { url: res.secure_url, public_id: res.public_id, local_path: files.thumbnail[0].path };
        }
      }
    };

    const updateCoverImage = async () => {
      if (files?.cover_image?.[0]) {
        if (book.cover_image?.public_id) {
          deleteFromCloudinary(book.cover_image.public_id).catch(()=>console.warn("Could not delete old cover"));
        }
        const res = await uploadOnCloudinary(files.cover_image[0].path, "mindgymbook/books/covers");
        if (res) {
          book.cover_image = { url: res.secure_url, public_id: res.public_id, local_path: files.cover_image[0].path };
        }
      }
    };

    const updateBookFile = async () => {
      const newBookFile = files?.pdf_file?.[0] || files?.epub_file?.[0];
      if (newBookFile) {
        const rawFileData = book.getDataValue("file_data");
        const existingFile = typeof rawFileData === "string" ? JSON.parse(rawFileData) : rawFileData;
        if (existingFile?.public_id) {
          deleteFromCloudinary(existingFile.public_id).catch(()=>console.warn("Could not delete old book file"));
        }

        const ext = path.extname(newBookFile.originalname).toLowerCase().replace(".", "");
        const folder = ext === "pdf" ? "mindgymbook/books/pdf" : "mindgymbook/books/epub";
        const res = await uploadOnCloudinary(newBookFile.path, folder);
        if (res) {
          book.setDataValue("file_data", { url: res.secure_url, public_id: res.public_id, type: ext, asset_type: res.type || "upload", local_path: newBookFile.path });
        }
      }
    };

    const updateAudioFile = async () => {
      if (files?.audio_file?.[0]) {
        const rawAudioData = book.getDataValue("audio_file");
        const existingAudio = typeof rawAudioData === "string" ? JSON.parse(rawAudioData) : rawAudioData;
        if (existingAudio?.public_id) {
          deleteFromCloudinary(existingAudio.public_id).catch(()=>console.warn("Could not delete old audio file"));
        }
        const res = await uploadOnCloudinary(files.audio_file[0].path, "mindgymbook/books/audio");
        if (res) {
          book.setDataValue("audio_file", { url: res.secure_url, public_id: res.public_id, asset_type: res.type || "upload", local_path: files.audio_file[0].path });
        }
      }
    };

    const updateGalleryImages = async () => {
      let gallery = [];
      if (data.images) {
        try { gallery = typeof data.images === "string" ? JSON.parse(data.images) : data.images; } 
        catch (e) { gallery = book.images || []; }
      } else {
        gallery = book.images || [];
      }

      // 3. Deletion of removed images
      if (Array.isArray(book.images)) {
        const currentPublicIds = gallery.map((img) => img.public_id);
        const deletionPromises = book.images.map(async (oldImg) => {
          if (oldImg.public_id && !currentPublicIds.includes(oldImg.public_id)) {
            await deleteFromCloudinary(oldImg.public_id).catch(()=>console.warn("Failed deleting gallery image"));
          }
        });
        await Promise.all(deletionPromises);
      }

      // 2. Uploading new images
      if (files?.images?.length > 0) {
        const uploadPromises = files.images.map(async (file) => {
          const res = await uploadOnCloudinary(file.path, "mindgymbook/books/gallery");
          if (res) gallery.push({ url: res.secure_url, public_id: res.public_id });
        });
        await Promise.all(uploadPromises);
      }
      
      book.images = gallery;
    };

    // Execute all updates simultaneously
    await Promise.all([
      updateThumbnail(),
      updateCoverImage(),
      updateBookFile(),
      updateAudioFile(),
      updateGalleryImages()
    ]);

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
      "previewPages",
      "dimensions",
      "weight",
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

    // Clear books cache
    await clearCachePattern("books:*");

    return await Book.findByPk(book.id, {
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });
  }

  async deleteBook(id) {
    const book = await Book.findByPk(id);
    if (!book) throw new Error("Book not found");

    if (book.thumbnail?.public_id)
      await deleteFromCloudinary(book.thumbnail.public_id);
    if (book.cover_image?.public_id)
      await deleteFromCloudinary(book.cover_image.public_id);
    if (book.file_data?.public_id)
      await deleteFromCloudinary(book.file_data.public_id);
    if (book.audio_file?.public_id)
      await deleteFromCloudinary(book.audio_file.public_id);

    // Cleanup gallery images
    if (Array.isArray(book.images)) {
      for (const img of book.images) {
        if (img.public_id) await deleteFromCloudinary(img.public_id);
      }
    }

    await book.destroy();

    // Clear books cache
    await clearCachePattern("books:*");

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

  async hasFullAccess(user, book) {
    if (!user) return !book.is_premium;
    const userId = user.id;
    const userType = user.user_type;

    if (userType === "admin") return true;
    if (!book.is_premium) return true;

    if (userId) {
      // 1. Check if book is purchased directly
      const purchase = await UserBook.findOne({
        where: { user_id: userId, book_id: book.id },
      });
      if (purchase) return true;

      // 2. Check for an ACTIVE subscription
      const activeSub = await Subscription.findOne({
        where: {
          user_id: userId,
          status: "active",
          end_date: { [Op.gt]: new Date() },
        },
        include: [{ model: Plan, as: "plan" }],
      });

      if (!activeSub) return false;

      // 3. User has active sub. Is this book already in their "Reading History"?
      // If they've already started the book, they should always have access during the sub period.
      const progress = await ReadingProgress.findOne({
        where: { user_id: userId, book_id: book.id },
      });
      if (progress) return true;

      // 4. New book - check the plan's read limit
      const plan = activeSub.plan;
      const limit = plan ? plan.book_read_limit : 5; // fallback to 5

      if (limit === -1) return true; // Unlimited access
      if (activeSub.books_read_count < limit) {
        return true;
      }
    }
    return false;
  }

  // Method to increment count when user actually opens a new book
  async incrementBookReadCount(userId, bookId) {
    // 1. Check if already reading this book
    const progress = await ReadingProgress.findOne({
      where: { user_id: userId, book_id: bookId },
    });
    if (progress) return; // Keep same count

    // 2. Check for active sub
    const activeSub = await Subscription.findOne({
      where: {
        user_id: userId,
        status: "active",
        end_date: { [Op.gt]: new Date() },
      },
      include: [{ model: Plan, as: "plan" }],
    });

    if (activeSub) {
      const plan = activeSub.plan;
      const limit = plan ? plan.book_read_limit : 5;

      // Only increment if not unlimited and within limit (or just started)
      if (limit === -1 || activeSub.books_read_count < limit) {
        // Create initial progress to mark as "reading"
        await ReadingProgress.create({
          user_id: userId,
          book_id: bookId,
          last_page: 1,
        });

        // Increment count
        await activeSub.increment("books_read_count", { by: 1 });
      }
    }
  }

  async getReadPdfUrl(bookId, user) {
    const book = await Book.findByPk(bookId);
    if (!book) throw new Error("Book not found");
    if (!book.file_data?.url) throw new Error("Book file not found");

    const hasAccess = await this.hasFullAccess(user, book);
    const baseUrl = (process.env.BASE_URL || "http://localhost:5000")
      .replace(/\/+$/, "")
      .replace(/\/api\/v1$/, "");
    const finalUrl = `${baseUrl}/api/v1/book/readBook/${bookId}`;

    return {
      pdf_url: finalUrl,
      isPreview: !hasAccess,
      total_pages: book.page_count || 0,
    };
  }
}

export default new BookService();
