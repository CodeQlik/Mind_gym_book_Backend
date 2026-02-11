import { Book, Category, SubCategory } from "../models/index.js";
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

  async createBook(data, file) {
    const {
      title,
      description,
      author,
      price,
      original_price,
      condition,
      stock,
      category_id,
      subcategory_id,
      is_active,
      published_date,
    } = data;

    const category = await Category.findByPk(category_id);
    if (!category) throw new Error("Invalid category ID");

    if (subcategory_id) {
      const subCategory = await SubCategory.findByPk(subcategory_id);
      if (!subCategory) throw new Error("Invalid subcategory ID");
    }

    const slug = this.generateSlug(title);
    const existingBook = await Book.findOne({ where: { slug } });
    if (existingBook)
      throw new Error("Book title already exists (slug conflict)");

    let thumbnailData = { url: "", public_id: "" };
    if (file) {
      const uploadResult = await uploadOnCloudinary(
        file.path,
        "books/thumbnails",
      );
      if (uploadResult) {
        thumbnailData = {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };
      }
    }

    return await Book.create({
      title,
      slug,
      author,
      description,
      price,
      original_price: original_price || null,
      condition: condition || "good",
      stock: stock || 1,
      thumbnail: thumbnailData,
      category_id,
      subcategory_id: subcategory_id || null,
      is_active: is_active !== undefined ? is_active : true,
      published_date: published_date || null,
    });
  }

  async getBooks(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Book.findAndCountAll({
      where: filters,
      include: [
        { model: Category, as: "category", attributes: ["name", "slug"] },
        { model: SubCategory, as: "subcategory", attributes: ["name", "slug"] },
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
        { model: SubCategory, as: "subcategory", attributes: ["name", "slug"] },
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
        {
          model: SubCategory,
          as: "subcategory",
          attributes: ["id", "name", "slug"],
        },
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
        {
          model: SubCategory,
          as: "subcategory",
          attributes: ["id", "name", "slug"],
        },
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

  async updateBook(id, data, file) {
    const book = await Book.findByPk(id);
    if (!book) throw new Error("Book not found");

    if (data.title) {
      data.slug = this.generateSlug(data.title);
    }

    if (data.category_id) {
      const category = await Category.findByPk(data.category_id);
      if (!category) throw new Error("Invalid category ID");
    }

    if (data.subcategory_id) {
      const subCategory = await SubCategory.findByPk(data.subcategory_id);
      if (!subCategory) throw new Error("Invalid subcategory ID");
    }

    if (file) {
      if (book.thumbnail?.public_id) {
        await deleteFromCloudinary(book.thumbnail.public_id);
      }
      const uploadResult = await uploadOnCloudinary(
        file.path,
        "books/thumbnails",
      );
      if (uploadResult) {
        data.thumbnail = {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };
      }
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

  async searchBooks(query, activeOnly = true, page = 1, limit = 10) {
    const { Op } = (await import("sequelize")).default;
    const offset = (page - 1) * limit;
    const where = {
      [Op.or]: [
        { title: { [Op.like]: `%${query}%` } },
        { author: { [Op.like]: `%${query}%` } },
        { description: { [Op.like]: `%${query}%` } },
      ],
    };

    if (activeOnly) where.is_active = true;

    const { count, rows } = await Book.findAndCountAll({
      where,
      include: [
        { model: Category, as: "category", attributes: ["name", "slug"] },
        { model: SubCategory, as: "subcategory", attributes: ["name", "slug"] },
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
