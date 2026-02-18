import { Op } from "sequelize";
import { Book, Category } from "../models/index.js";
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

    // Upload thumbnail
    let thumbnailData = { url: "", public_id: "" };
    if (files?.thumbnail?.length > 0) {
      const uploadResult = await uploadOnCloudinary(
        files.thumbnail[0].path,
        "mindgymbook/books/thumbnails",
      );
      if (!uploadResult)
        throw new Error("Failed to upload thumbnail to Cloudinary");
      thumbnailData = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    // Upload cover image
    let coverImageData = { url: "", public_id: "" };
    if (files?.cover_image?.length > 0) {
      const uploadResult = await uploadOnCloudinary(
        files.cover_image[0].path,
        "mindgymbook/books/covers",
      );
      if (!uploadResult)
        throw new Error("Failed to upload cover image to Cloudinary");
      coverImageData = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    // Upload PDF
    let pdfFileData = { url: "", public_id: "" };
    if (files?.pdf_file?.length > 0) {
      const uploadResult = await uploadOnCloudinary(
        files.pdf_file[0].path,
        "mindgymbook/books/pdfs",
      );
      if (!uploadResult) throw new Error("Failed to upload PDF to Cloudinary");
      pdfFileData = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    // Upload gallery images
    let extraImages = [];
    if (files?.images?.length > 0) {
      for (const file of files.images) {
        const uploadResult = await uploadOnCloudinary(
          file.path,
          "mindgymbook/books/gallery",
        );
        if (uploadResult) {
          extraImages.push({
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
          });
        }
      }
    }

    const book = await Book.create({
      title,
      slug,
      author,
      description,
      price,
      original_price: original_price || null,
      condition: condition || "good",
      stock: stock || 1,
      thumbnail: thumbnailData,
      cover_image: coverImageData,
      pdf_file: pdfFileData,
      images: extraImages,
      category_id,
      is_active:
        is_active !== undefined ? (is_active === "false" ? false : true) : true,
      published_date: published_date || null,
      is_premium: is_premium === "true" || is_premium === true,
      is_bestselling: is_bestselling === "true" || is_bestselling === true,
      is_trending: is_trending === "true" || is_trending === true,
      highlights: highlights || null,
      isbn: isbn || null,
      language: language || null,
      otherdescription: otherdescription || null,
    });

    // Reload with category association
    return await Book.findByPk(book.id, {
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });
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
      const oldThumb = book.thumbnail;
      if (oldThumb?.public_id) await deleteFromCloudinary(oldThumb.public_id);
      const uploadResult = await uploadOnCloudinary(
        files.thumbnail[0].path,
        "mindgymbook/books/thumbnails",
      );
      if (!uploadResult) throw new Error("Failed to upload updated thumbnail");
      book.thumbnail = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    // Handle cover image upload
    if (files?.cover_image?.[0]) {
      const oldCover = book.cover_image;
      if (oldCover?.public_id) await deleteFromCloudinary(oldCover.public_id);
      const uploadResult = await uploadOnCloudinary(
        files.cover_image[0].path,
        "mindgymbook/books/covers",
      );
      if (!uploadResult)
        throw new Error("Failed to upload updated cover image");
      book.cover_image = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    // Handle PDF upload
    if (files?.pdf_file?.[0]) {
      const oldPdf = book.pdf_file;
      if (oldPdf?.public_id) await deleteFromCloudinary(oldPdf.public_id);
      const uploadResult = await uploadOnCloudinary(
        files.pdf_file[0].path,
        "mindgymbook/books/pdfs",
      );
      if (!uploadResult) throw new Error("Failed to upload updated PDF");
      book.pdf_file = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    // Handle gallery images
    if (files?.images?.length > 0) {
      const oldImages = book.images;
      if (Array.isArray(oldImages)) {
        for (const img of oldImages) {
          if (img.public_id) await deleteFromCloudinary(img.public_id);
        }
      }
      const extraImages = [];
      for (const file of files.images) {
        const uploadResult = await uploadOnCloudinary(
          file.path,
          "mindgymbook/books/gallery",
        );
        if (uploadResult)
          extraImages.push({
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
          });
      }
      book.images = extraImages;
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
}

export default new BookService();
