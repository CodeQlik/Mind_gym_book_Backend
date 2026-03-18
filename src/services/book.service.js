import { Op } from "sequelize";
import path from "path";
import { Book, Category, User, UserBook, Subscription, Plan, ReadingProgress, Audiobook } from "../models/index.js";
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
    if (!category) throw new Error("Invalid category ID.");

    const slug = this.generateSlug(title);
    const existingBook = await Book.findOne({ where: { slug } });
    if (existingBook)
      throw new Error("A book with this title already exists.");

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
      // Priority 1: Direct File Upload
      const bookFileInput = files?.book_file?.[0] || files?.pdf_file?.[0] || files?.epub_file?.[0];
      if (bookFileInput) {
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
      }

      // Priority 2: External URL
      if (data.external_file_url) {
        const url = data.external_file_url;
        const detectedType = url.toLowerCase().includes(".epub") ? "epub" : "pdf";
        return {
          url: url,
          public_id: null,
          type: data.external_file_type || detectedType,
          asset_type: "external"
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
    const [thumbnailData, coverImageData, bookFileData, extraImages] = await Promise.all([
      uploadFiles(files?.thumbnail, "mindgymbook/books/thumbnails"),
      uploadFiles(files?.cover_image, "mindgymbook/books/covers"),
      uploadBookFile(),
      uploadExtraImages(),
    ]);

    // Digital file (PDF/EPUB) is now optional to support audio-only books

    const validConditions = ["new", "fair", "good", "acceptable"];
    const inputCondition = (condition || "good").toLowerCase().trim();
    const sanitizedCondition = validConditions.includes(inputCondition)
      ? inputCondition
      : "good";

    // Strip HTML tags for database cleanliness
    const cleanDescription = (description || "").replace(/<[^>]*>?/gm, "");
    const cleanHighlights = (highlights || "").replace(/<[^>]*>?/gm, "");

    const bookDataForCreation = {
      title,
      slug,
      author,
      description: cleanDescription,
      price: parseFloat(price) || 0,
      original_price: original_price ? parseFloat(original_price) : null,
      condition: sanitizedCondition,
      stock: parseInt(stock) || 0,
      thumbnail: thumbnailData || { url: "", public_id: "" },
      cover_image: coverImageData || { url: "", public_id: "" },
      file_data: bookFileData || null,
      images: extraImages,
      category_id,
      is_active:
        (parseInt(stock) || 0) <= 0
          ? false
          : (is_active === undefined ? true : is_active === "true" || is_active === true),
      published_date: published_date || null,
      is_premium: is_premium === "true" || is_premium === true,
      is_bestselling: is_bestselling === "true" || is_bestselling === true,
      is_trending: is_trending === "true" || is_trending === true,
      highlights: cleanHighlights,
      isbn,
      language,
      page_count: 0,
      previewPages: parseInt(previewPages) || 5, // Default 5 pages
      dimensions,
      weight,
    };

    const book = await Book.create(bookDataForCreation);

    // If audio chapters are provided, create them
    if (data.audio_chapters) {
      try {
        const chapters = typeof data.audio_chapters === "string"
          ? JSON.parse(data.audio_chapters)
          : data.audio_chapters;

        if (Array.isArray(chapters) && chapters.length > 0) {
          const narrator = data.audio_narrator || author;
          const language = data.language || "Hindi";

          let audioFileIndex = 0;
          for (const ch of chapters) {
            let audioData = {
              url: ch.audio_url || "",
              public_id: null,
              asset_type: "external"
            };

            // If chapter is set to use an uploaded file
            if (ch.use_file && files?.audio_files?.[audioFileIndex]) {
              const file = files.audio_files[audioFileIndex];
              const res = await uploadOnCloudinary(file.path, "mindgymbook/audiobooks");
              if (res) {
                audioData = {
                  url: res.secure_url,
                  public_id: res.public_id,
                  asset_type: "upload"
                };
              }
              audioFileIndex++;
            }

            await Audiobook.create({
              book_id: book.id,
              chapter_number: parseInt(ch.chapter_number) || 1,
              chapter_title: ch.chapter_title || "Chapter",
              narrator: ch.narrator || narrator,
              audio_file: audioData,
              language: language,
              status: true
            });
          }
        }
      } catch (parseError) {
        console.error("Error parsing audio_chapters:", parseError.message);
      }
    }

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
  async getBooks(filters = {}, page = 1, limit = 50, grouped = true) {
    const cacheKey = `books:list:${JSON.stringify(filters)}:${page}:${limit}:${grouped}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) return cachedData;

    const offset = (page - 1) * limit;

    let result;

    if (grouped) {
      // Grouped by Category (Requested for All Books API)
      const totalItems = await Book.count({ where: filters });
      const categoriesWithBooks = await Category.findAll({
        attributes: ["id", "name"],
        include: [
          {
            model: Book,
            as: "books",
            where: filters,
            attributes: ["id", "title", "author", "price", "description", "highlights", "slug", "cover_image", "thumbnail", "images", "language", "file_data", "is_active", "stock", "reserved"],
            include: [
              {
                model: Audiobook,
                as: "audiobooks",
                attributes: ["id", "chapter_number", "chapter_title", "audio_file", "narrator"],
                order: [["chapter_number", "ASC"]]
              }
            ],
            required: true
          }
        ],
        order: [["created_at", "DESC"]],
        limit,
        offset,
        subQuery: false
      });

      result = {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        categories: categoriesWithBooks
      };
    } else {
      // Flat List (For Admin Tables and standard lists)
      const { count, rows } = await Book.findAndCountAll({
        where: filters,
        include: [
          { model: Category, as: "category", attributes: ["id", "name", "slug"] },
          {
            model: Audiobook,
            as: "audiobooks",
            attributes: ["id", "chapter_number", "chapter_title", "audio_file", "narrator"]
          }
        ],
        order: [["created_at", "DESC"]],
        limit,
        offset
      });

      result = {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        books: rows
      };
    }

    await setCache(cacheKey, result);
    return result;
  }

  async getBooksByCategoryId(
    category_id,
    activeOnly = true,
    page = 1,
    limit = 10,
    userId = null,
  ) {
    const offset = (page - 1) * limit;
    const where = { category_id };
    if (activeOnly) where.is_active = true;

    const { count, rows } = await Book.findAndCountAll({
      where,
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const books = userId
      ? await this.injectBookmarkStatus(rows, userId)
      : rows;

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      books,
    };
  }

  async getBookBySlug(slug, activeOnly = true) {
    const book = await Book.findOne({
      where: { slug },
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
        {
          model: Audiobook,
          as: "audiobooks",
          attributes: ["id", "chapter_number", "chapter_title", "audio_file", "narrator"],
          order: [["chapter_number", "ASC"]]
        }
      ],
    });

    if (!book) {
      throw new Error(`No book was found with the slug: ${slug}.`);
    }

    if (activeOnly && !book.is_active) {
      throw new Error("This book is currently marked as draft and is not publicly available.");
    }

    return book;
  }

  async getBookById(id, activeOnly = true) {
    const book = await Book.findOne({
      where: { id },
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
        {
          model: Audiobook,
          as: "audiobooks",
          attributes: ["id", "chapter_number", "chapter_title", "audio_file", "narrator"],
          order: [["chapter_number", "ASC"]]
        }
      ],
    });

    if (!book) {
      throw new Error(`No book was found with ID: ${id}.`);
    }

    if (activeOnly && !book.is_active) {
      throw new Error("This book is currently marked as draft and is not publicly available.");
    }

    return book;
  }

  async toggleBookStatus(id) {
    const book = await Book.findByPk(id);
    if (!book) throw new Error("The specified book was not found.");

    if (book.stock <= 0 && !book.is_active) {
      throw new Error("Cannot publish a book with zero stock. Please update the stock level first.");
    }

    book.is_active = !book.is_active;
    await book.save();

    await clearCachePattern("books:*");
    return book;
  }

  async updateBook(id, data, files) {
    const book = await Book.findByPk(id);
    if (!book) throw new Error("The specified book was not found.");

    // 1. Concurrent Simple Validations & Preparation
    const validationTasks = [];
    if (data.title && data.title !== book.title) {
      const newSlug = this.generateSlug(data.title);
      validationTasks.push(
        Book.findOne({
          where: { slug: newSlug, id: { [Op.ne]: id } },
          attributes: ["id"],
        }).then((existing) => {
          if (existing) throw new Error("Another book with this title already exists.");
          book.title = data.title;
          book.slug = newSlug;
        })
      );
    }

    if (data.category_id) {
      validationTasks.push(
        Category.findByPk(data.category_id, { attributes: ["id"] }).then((cat) => {
          if (!cat) throw new Error("Invalid category ID.");
          book.category_id = data.category_id;
        })
      );
    }

    // Smart routing for 'book_file'
    if (files?.book_file?.[0]) {
      const file = files.book_file[0];
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === ".pdf" && !files.pdf_file) files.pdf_file = [file];
      else if (ext === ".epub" && !files.epub_file) files.epub_file = [file];
    }

    await Promise.all(validationTasks);

    // 2. Prepare Background Deletion Queue
    const cloudCleanupQueue = [];
    const addToCleanup = (id) => {
      if (id) cloudCleanupQueue.push(deleteFromCloudinary(id).catch((e) => console.warn("[Background Cleanup] Failed:", e.message)));
    };

    // 3. Define Upload Tasks (Parallel)
    const uploadTasks = [];

    // Thumbnail
    if (files?.thumbnail?.[0]) {
      uploadTasks.push(
        uploadOnCloudinary(files.thumbnail[0].path, "mindgymbook/books/thumbnails").then((res) => {
          if (res) {
            addToCleanup(book.thumbnail?.public_id);
            book.thumbnail = { url: res.secure_url, public_id: res.public_id, local_path: files.thumbnail[0].path };
          }
        })
      );
    }

    // Cover Image
    if (files?.cover_image?.[0]) {
      uploadTasks.push(
        uploadOnCloudinary(files.cover_image[0].path, "mindgymbook/books/covers").then((res) => {
          if (res) {
            addToCleanup(book.cover_image?.public_id);
            book.cover_image = { url: res.secure_url, public_id: res.public_id, local_path: files.cover_image[0].path };
          }
        })
      );
    }

    // Book File (PDF/EPUB)
    const newBookFile = files?.pdf_file?.[0] || files?.epub_file?.[0];
    if (newBookFile) {
      uploadTasks.push(
        uploadOnCloudinary(newBookFile.path, `mindgymbook/books/${path.extname(newBookFile.originalname).slice(1)}`).then((res) => {
          if (res) {
            const currentFile = typeof book.file_data === "string" ? JSON.parse(book.file_data) : book.file_data;
            addToCleanup(currentFile?.public_id);
            book.setDataValue("file_data", {
              url: res.secure_url,
              public_id: res.public_id,
              type: path.extname(newBookFile.originalname).replace(".", "").toLowerCase(),
              asset_type: res.type || "upload",
              local_path: newBookFile.path,
            });
          }
        })
      );
    }

    // Gallery Images
    let gallery = [];
    if (data.images) {
      try { gallery = typeof data.images === "string" ? JSON.parse(data.images) : data.images; } catch (e) { gallery = book.images || []; }
    } else { gallery = book.images || []; }

    if (Array.isArray(book.images)) {
      const currentPublicIds = gallery.map((img) => img.public_id);
      book.images.forEach((oldImg) => {
        if (oldImg.public_id && !currentPublicIds.includes(oldImg.public_id)) addToCleanup(oldImg.public_id);
      });
    }

    if (files?.images?.length > 0) {
      files.images.forEach((file) => {
        uploadTasks.push(
          uploadOnCloudinary(file.path, "mindgymbook/books/gallery").then((res) => {
            if (res) gallery.push({ url: res.secure_url, public_id: res.public_id });
          })
        );
      });
    }

    // 4. Handle Audio Chapters (Heavy Parallel)
    let audioChaptersToSave = [];
    if (data.audio_chapters) {
      try {
        const chapters = typeof data.audio_chapters === "string" ? JSON.parse(data.audio_chapters) : data.audio_chapters;
        const existingAudiobooks = await Audiobook.findAll({ where: { book_id: id }, attributes: ["id", "audio_file"] });
        const existingMap = new Map(existingAudiobooks.map((a) => [parseInt(a.id), a]));

        const updatedIds = chapters.filter((ch) => ch.id).map((ch) => parseInt(ch.id));
        existingAudiobooks.forEach((ab) => {
          if (!updatedIds.includes(parseInt(ab.id))) {
            addToCleanup(ab.audio_file?.public_id);
            // Non-blocking destroy
            Audiobook.destroy({ where: { id: ab.id } }).catch(() => { });
          }
        });

        let audioFileIndex = 0;
        chapters.forEach((ch, idx) => {
          const chapterData = { ...ch, index: idx };
          const existingAb = ch.id ? existingMap.get(parseInt(ch.id)) : null;

          if (ch.use_file && files?.audio_files?.[audioFileIndex]) {
            const file = files.audio_files[audioFileIndex];
            audioFileIndex++;
            uploadTasks.push(
              uploadOnCloudinary(file.path, "mindgymbook/audiobooks").then((res) => {
                if (res) {
                  if (existingAb) addToCleanup(existingAb.audio_file?.public_id);
                  chapterData.final_audio_file = { url: res.secure_url, public_id: res.public_id, asset_type: "upload" };
                }
                audioChaptersToSave.push(chapterData);
              })
            );
          } else {
            chapterData.final_audio_file = ch.audio_file || { url: "", public_id: "", asset_type: "external" };
            audioChaptersToSave.push(chapterData);
          }
        });
      } catch (err) { console.error("Error preparing audio chapters:", err.message); }
    }

    // 5. Execute all uploads in parallel
    await Promise.all(uploadTasks);

    // 6. Final Scalar Updates
    book.images = gallery;
    const scalarFields = ["description", "author", "price", "original_price", "condition", "stock", "published_date", "isbn", "language", "highlights", "previewPages", "dimensions", "weight"];
    scalarFields.forEach((field) => {
      if (data[field] !== undefined) {
        if (field === "description" || field === "highlights") book[field] = String(data[field]).replace(/<[^>]*>?/gm, "");
        else book[field] = data[field];
      }
    });

    if (data.is_active !== undefined) book.is_active = data.is_active === "true" || data.is_active === true;
    if (book.stock <= 0) book.is_active = false;
    ["is_premium", "is_bestselling", "is_trending"].forEach(f => {
      if (data[f] !== undefined) book[f] = String(data[f]) === "true";
    });

    // 7. Save Book and Audiobooks (Batch)
    const finalOps = [book.save()];

    if (audioChaptersToSave.length > 0) {
      audioChaptersToSave.forEach((ch) => {
        const payload = {
          book_id: id,
          chapter_number: parseInt(ch.chapter_number) || 1,
          chapter_title: ch.chapter_title || "Chapter",
          audio_file: ch.final_audio_file,
          language: data.language || book.language || "Hindi",
          narrator: data.author || book.author,
          status: true,
        };
        if (ch.id) finalOps.push(Audiobook.update(payload, { where: { id: ch.id } }));
        else finalOps.push(Audiobook.create(payload));
      });
    }

    // Propagate language/author updates if no specific chapter data was provided but fields changed
    if (!data.audio_chapters && (data.language || data.author)) {
      const propagate = {};
      if (data.language) propagate.language = data.language;
      if (data.author) propagate.narrator = data.author;
      finalOps.push(Audiobook.update(propagate, { where: { book_id: id } }));
    }

    await Promise.all(finalOps);

    // 8. Final Background Tasks
    clearCachePattern("books:*").catch(() => { });
    // Cloud cleanup runs in background independently

    return await Book.findByPk(id, {
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
        { model: Audiobook, as: "audiobooks", attributes: ["id", "chapter_number", "chapter_title", "audio_file", "narrator"] },
      ],
    });
  }


  async deleteBook(id) {
    const book = await Book.findByPk(id);
    if (!book) throw new Error("The specified book was not found.");

    if (book.thumbnail?.public_id)
      await deleteFromCloudinary(book.thumbnail.public_id);
    if (book.cover_image?.public_id)
      await deleteFromCloudinary(book.cover_image.public_id);
    if (book.file_data?.public_id)
      await deleteFromCloudinary(book.file_data.public_id);

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
    userId = null,
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
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const books = userId
      ? await this.injectBookmarkStatus(rows, userId)
      : rows;

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      books,
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
    if (!book) throw new Error("The specified book was not found.");
    if (!book.file_data?.url) throw new Error("The file for this book could not be found.");

    const hasAccess = await this.hasFullAccess(user, book);
    const baseUrl = (process.env.BASE_URL)
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
