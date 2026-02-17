import { Book, Category } from "../models/index.js";
import fs from "fs";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

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
      isbn,
      language,
    } = data;

    const category = await Category.findByPk(category_id);
    if (!category) throw new Error("Invalid category ID");

    const slug = this.generateSlug(title);
    const existingBook = await Book.findOne({ where: { slug } });
    if (existingBook)
      throw new Error("Book title already exists (slug conflict)");

    let thumbnailData = { url: "", public_id: "" };
    if (files && files.thumbnail && files.thumbnail.length > 0) {
      const uploadResult = await uploadOnCloudinary(
        files.thumbnail[0].path,
        "mindgymbook/books/thumbnails",
      );
      if (!uploadResult) {
        throw new Error("Failed to upload thumbnail to Cloudinary");
      }
      thumbnailData = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    let pdfFileData = { url: "", public_id: "" };
    if (files && files.pdf_file && files.pdf_file.length > 0) {
      const uploadResult = await uploadOnCloudinary(
        files.pdf_file[0].path,
        "mindgymbook/books/pdfs",
      );
      if (!uploadResult) {
        throw new Error("Failed to upload PDF to Cloudinary");
      }
      pdfFileData = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    const bookData = {
      title,
      slug,
      author,
      description,
      price,
      original_price: original_price || null,
      condition: condition || "good",
      stock: stock || 1,
      thumbnail: thumbnailData,
      pdf_file: pdfFileData,
      category_id,
      is_active: is_active !== undefined ? is_active : true,
      published_date: published_date || null,
      is_premium: is_premium === "true" || is_premium === true,
      isbn: isbn || null,
      language: language || null,
    };

    const createdBook = await Book.create(bookData);

    return createdBook;
  }

  async getBooks(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Book.findAndCountAll({
      where: filters,
      include: [
        { model: Category, as: "category", attributes: ["name", "slug"] },
      ],
      offset,
      limit,
      order: [["createdAt", "DESC"]],
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
        { model: Category, as: "category", attributes: ["name", "slug"] },
      ],
      offset,
      limit,
      order: [["createdAt", "DESC"]],
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      books: rows,
    };
  }

  async getBookBySlug(slug, activeOnly = true) {
    const book = await Book.findOne({
      where: { slug },
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });

    if (!book) throw new Error("Book not found");

    if (activeOnly && !book.is_active) {
      throw new Error("Book is currently inactive");
    }

    return book;
  }

  async getBookById(id, activeOnly = true) {
    const book = await Book.findByPk(id, {
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });

    if (!book) throw new Error("Book not found");

    if (activeOnly && !book.is_active) {
      throw new Error("Book is currently inactive");
    }

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

    if (data.title) {
      data.slug = this.generateSlug(data.title);
    }

    if (data.category_id) {
      const category = await Category.findByPk(data.category_id);
      if (!category) throw new Error("Invalid category ID");
    }

    if (files?.thumbnail?.[0]) {
      if (book.thumbnail?.public_id) {
        await deleteFromCloudinary(book.thumbnail.public_id);
      }
      const uploadResult = await uploadOnCloudinary(
        files.thumbnail[0].path,
        "mindgymbook/books/thumbnails",
      );
      if (!uploadResult) {
        throw new Error("Failed to upload updated thumbnail to Cloudinary");
      }
      data.thumbnail = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    if (files?.pdf_file?.[0]) {
      if (book.pdf_file?.public_id) {
        await deleteFromCloudinary(book.pdf_file.public_id);
      }

      const uploadResult = await uploadOnCloudinary(
        files.pdf_file[0].path,
        "mindgymbook/books/pdfs",
      );
      if (!uploadResult) {
        throw new Error("Failed to upload updated PDF to Cloudinary");
      }

      data.pdf_file = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    if (data.is_premium !== undefined) {
      data.is_premium = data.is_premium === "true" || data.is_premium === true;
    }

    if (data.isbn !== undefined) {
      book.isbn = data.isbn;
    }

    if (data.language !== undefined) {
      book.language = data.language;
    }

    await book.update(data);
    return book;
  }

  async deleteBook(id) {
    const book = await Book.findByPk(id);
    if (!book) throw new Error("Book not found");

    if (book.thumbnail && book.thumbnail.public_id) {
      await deleteFromCloudinary(book.thumbnail.public_id);
    }

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
    const { Op } = (await import("sequelize")).default;
    const offset = (page - 1) * limit;
    const where = {
      [Op.or]: [
        { title: { [Op.like]: `%${query}%` } },
        { author: { [Op.like]: `%${query}%` } },
        { description: { [Op.like]: `%${query}%` } },
        { isbn: { [Op.like]: `%${query}%` } },
      ],
    };

    if (status) {
      if (status === "active") where.is_active = true;
      if (status === "inactive") where.is_active = false;
    } else if (activeOnly) {
      where.is_active = true;
    }

    const { count, rows } = await Book.findAndCountAll({
      where,
      include: [
        { model: Category, as: "category", attributes: ["name", "slug"] },
      ],
      offset,
      limit,
      order: [["createdAt", "DESC"]],
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      books: rows,
    };
  }
}

export default new BookService();
