import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";
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
    const [category] = await sequelize.query(
      "SELECT id FROM categories WHERE id = :category_id LIMIT 1",
      { replacements: { category_id }, type: QueryTypes.SELECT },
    );
    if (!category) throw new Error("Invalid category ID");

    const slug = this.generateSlug(title);
    const [existingBook] = await sequelize.query(
      "SELECT id FROM books WHERE slug = :slug LIMIT 1",
      { replacements: { slug }, type: QueryTypes.SELECT },
    );
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

    const [, meta] = await sequelize.query(
      `INSERT INTO books (title, slug, author, description, price, original_price, \`condition\`, stock,
        thumbnail, cover_image, pdf_file, images, category_id, is_active, published_date,
        is_premium, is_bestselling, is_trending, highlights, isbn, language, otherdescription,
        created_at, updated_at)
       VALUES (:title, :slug, :author, :description, :price, :original_price, :condition, :stock,
        :thumbnail, :cover_image, :pdf_file, :images, :category_id, :is_active, :published_date,
        :is_premium, :is_bestselling, :is_trending, :highlights, :isbn, :language, :otherdescription,
        NOW(), NOW())`,
      {
        replacements: {
          title,
          slug,
          author,
          description,
          price,
          original_price: original_price || null,
          condition: condition || "good",
          stock: stock || 1,
          thumbnail: JSON.stringify(thumbnailData),
          cover_image: JSON.stringify(coverImageData),
          pdf_file: JSON.stringify(pdfFileData),
          images: JSON.stringify(extraImages),
          category_id,
          is_active:
            is_active !== undefined ? (is_active === "false" ? 0 : 1) : 1,
          published_date: published_date || null,
          is_premium: is_premium === "true" || is_premium === true ? 1 : 0,
          is_bestselling:
            is_bestselling === "true" || is_bestselling === true ? 1 : 0,
          is_trending: is_trending === "true" || is_trending === true ? 1 : 0,
          highlights: highlights || null,
          isbn: isbn || null,
          language: language || null,
          otherdescription: otherdescription || null,
        },
        type: QueryTypes.INSERT,
      },
    );

    const [createdBook] = await sequelize.query(
      `SELECT b.*, c.name AS category_name, c.slug AS category_slug
       FROM books b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = :id LIMIT 1`,
      { replacements: { id: meta }, type: QueryTypes.SELECT },
    );
    return createdBook;
  }

  async getBooks(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const whereClauses = [];
    const replacements = { limit, offset };

    if (filters.is_active !== undefined) {
      whereClauses.push("b.is_active = :is_active");
      replacements.is_active = filters.is_active ? 1 : 0;
    }
    if (filters.category_id) {
      whereClauses.push("b.category_id = :category_id");
      replacements.category_id = filters.category_id;
    }
    if (filters.is_premium !== undefined) {
      whereClauses.push("b.is_premium = :is_premium");
      replacements.is_premium = filters.is_premium ? 1 : 0;
    }
    if (filters.is_bestselling !== undefined) {
      whereClauses.push("b.is_bestselling = :is_bestselling");
      replacements.is_bestselling = filters.is_bestselling ? 1 : 0;
    }
    if (filters.is_trending !== undefined) {
      whereClauses.push("b.is_trending = :is_trending");
      replacements.is_trending = filters.is_trending ? 1 : 0;
    }

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM books b ${whereSQL}`,
      { replacements, type: QueryTypes.SELECT },
    );
    const total = countResult.total;

    const books = await sequelize.query(
      `SELECT b.*, c.name AS category_name, c.slug AS category_slug
       FROM books b LEFT JOIN categories c ON b.category_id = c.id
       ${whereSQL} ORDER BY b.created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT },
    );

    return {
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      books,
    };
  }

  async getBooksByCategoryId(
    category_id,
    activeOnly = true,
    page = 1,
    limit = 10,
  ) {
    const offset = (page - 1) * limit;
    const activeClause = activeOnly ? "AND b.is_active = 1" : "";

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM books b WHERE b.category_id = :category_id ${activeClause}`,
      { replacements: { category_id }, type: QueryTypes.SELECT },
    );
    const total = countResult.total;

    const books = await sequelize.query(
      `SELECT b.*, c.name AS category_name, c.slug AS category_slug
       FROM books b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.category_id = :category_id ${activeClause}
       ORDER BY b.created_at DESC LIMIT :limit OFFSET :offset`,
      { replacements: { category_id, limit, offset }, type: QueryTypes.SELECT },
    );

    return {
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      books,
    };
  }

  async getBookBySlug(slug, activeOnly = true) {
    const [book] = await sequelize.query(
      `SELECT b.*, c.id AS cat_id, c.name AS category_name, c.slug AS category_slug
       FROM books b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.slug = :slug LIMIT 1`,
      { replacements: { slug }, type: QueryTypes.SELECT },
    );
    if (!book) throw new Error("Book not found");
    if (activeOnly && !book.is_active)
      throw new Error("Book is currently inactive");
    return book;
  }

  async getBookById(id, activeOnly = true) {
    const [book] = await sequelize.query(
      `SELECT b.*, c.id AS cat_id, c.name AS category_name, c.slug AS category_slug
       FROM books b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = :id LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    if (!book) throw new Error("Book not found");
    if (activeOnly && !book.is_active)
      throw new Error("Book is currently inactive");
    return book;
  }

  async toggleBookStatus(id) {
    const [book] = await sequelize.query(
      "SELECT id, is_active FROM books WHERE id = :id LIMIT 1",
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    if (!book) throw new Error("Book not found");

    const newStatus = book.is_active ? 0 : 1;
    await sequelize.query(
      "UPDATE books SET is_active = :is_active, updated_at = NOW() WHERE id = :id",
      { replacements: { is_active: newStatus, id }, type: QueryTypes.UPDATE },
    );

    const [updated] = await sequelize.query(
      "SELECT * FROM books WHERE id = :id LIMIT 1",
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    return updated;
  }

  async updateBook(id, data, files) {
    const [book] = await sequelize.query(
      "SELECT * FROM books WHERE id = :id LIMIT 1",
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    if (!book) throw new Error("Book not found");

    const setClauses = ["updated_at = NOW()"];
    const replacements = { id };

    // Handle title/slug change
    if (data.title && data.title !== book.title) {
      const newSlug = this.generateSlug(data.title);
      const [existingBook] = await sequelize.query(
        "SELECT id FROM books WHERE slug = :slug AND id != :id LIMIT 1",
        { replacements: { slug: newSlug, id }, type: QueryTypes.SELECT },
      );
      if (existingBook)
        throw new Error("Another book already exists with this title");
      setClauses.push("title = :title", "slug = :slug");
      replacements.title = data.title;
      replacements.slug = newSlug;
    }

    // Validate category
    if (data.category_id) {
      const [cat] = await sequelize.query(
        "SELECT id FROM categories WHERE id = :category_id LIMIT 1",
        {
          replacements: { category_id: data.category_id },
          type: QueryTypes.SELECT,
        },
      );
      if (!cat) throw new Error("Invalid category ID");
      setClauses.push("category_id = :category_id");
      replacements.category_id = data.category_id;
    }

    // Handle thumbnail upload
    if (files?.thumbnail?.[0]) {
      let oldThumb = book.thumbnail;
      if (typeof oldThumb === "string") {
        try {
          oldThumb = JSON.parse(oldThumb);
        } catch {
          oldThumb = {};
        }
      }
      if (oldThumb?.public_id) await deleteFromCloudinary(oldThumb.public_id);
      const uploadResult = await uploadOnCloudinary(
        files.thumbnail[0].path,
        "mindgymbook/books/thumbnails",
      );
      if (!uploadResult) throw new Error("Failed to upload updated thumbnail");
      setClauses.push("thumbnail = :thumbnail");
      replacements.thumbnail = JSON.stringify({
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      });
    }

    // Handle cover image upload
    if (files?.cover_image?.[0]) {
      let oldCover = book.cover_image;
      if (typeof oldCover === "string") {
        try {
          oldCover = JSON.parse(oldCover);
        } catch {
          oldCover = {};
        }
      }
      if (oldCover?.public_id) await deleteFromCloudinary(oldCover.public_id);
      const uploadResult = await uploadOnCloudinary(
        files.cover_image[0].path,
        "mindgymbook/books/covers",
      );
      if (!uploadResult)
        throw new Error("Failed to upload updated cover image");
      setClauses.push("cover_image = :cover_image");
      replacements.cover_image = JSON.stringify({
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      });
    }

    // Handle PDF upload
    if (files?.pdf_file?.[0]) {
      let oldPdf = book.pdf_file;
      if (typeof oldPdf === "string") {
        try {
          oldPdf = JSON.parse(oldPdf);
        } catch {
          oldPdf = {};
        }
      }
      if (oldPdf?.public_id) await deleteFromCloudinary(oldPdf.public_id);
      const uploadResult = await uploadOnCloudinary(
        files.pdf_file[0].path,
        "mindgymbook/books/pdfs",
      );
      if (!uploadResult) throw new Error("Failed to upload updated PDF");
      setClauses.push("pdf_file = :pdf_file");
      replacements.pdf_file = JSON.stringify({
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      });
    }

    // Handle gallery images
    if (files?.images?.length > 0) {
      let oldImages = book.images;
      if (typeof oldImages === "string") {
        try {
          oldImages = JSON.parse(oldImages);
        } catch {
          oldImages = [];
        }
      }
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
      setClauses.push("images = :images");
      replacements.images = JSON.stringify(extraImages);
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
      if (data[field] !== undefined) {
        setClauses.push(`${field} = :${field}`);
        replacements[field] = data[field];
      }
    });

    // Boolean fields
    if (data.is_active !== undefined) {
      setClauses.push("is_active = :is_active");
      replacements.is_active = data.is_active === "false" ? 0 : 1;
    }
    if (data.is_premium !== undefined) {
      setClauses.push("is_premium = :is_premium");
      replacements.is_premium = String(data.is_premium) === "true" ? 1 : 0;
    }
    if (data.is_bestselling !== undefined) {
      setClauses.push("is_bestselling = :is_bestselling");
      replacements.is_bestselling =
        String(data.is_bestselling) === "true" ? 1 : 0;
    }
    if (data.is_trending !== undefined) {
      setClauses.push("is_trending = :is_trending");
      replacements.is_trending = String(data.is_trending) === "true" ? 1 : 0;
    }

    await sequelize.query(
      `UPDATE books SET ${setClauses.join(", ")} WHERE id = :id`,
      { replacements, type: QueryTypes.UPDATE },
    );

    const [updated] = await sequelize.query(
      `SELECT b.*, c.name AS category_name, c.slug AS category_slug
       FROM books b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = :id LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    return updated;
  }

  async deleteBook(id) {
    const [book] = await sequelize.query(
      "SELECT * FROM books WHERE id = :id LIMIT 1",
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    if (!book) throw new Error("Book not found");

    let thumbnail = book.thumbnail;
    if (typeof thumbnail === "string") {
      try {
        thumbnail = JSON.parse(thumbnail);
      } catch {
        thumbnail = {};
      }
    }
    if (thumbnail?.public_id) await deleteFromCloudinary(thumbnail.public_id);

    await sequelize.query("DELETE FROM books WHERE id = :id", {
      replacements: { id },
      type: QueryTypes.DELETE,
    });
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

    let activeClause = "";
    if (status === "active") activeClause = "AND b.is_active = 1";
    else if (status === "inactive") activeClause = "AND b.is_active = 0";
    else if (activeOnly) activeClause = "AND b.is_active = 1";

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM books b
       WHERE (b.title LIKE :search OR b.author LIKE :search OR b.description LIKE :search
              OR b.otherdescription LIKE :search OR b.isbn LIKE :search) ${activeClause}`,
      { replacements: { search: searchTerm }, type: QueryTypes.SELECT },
    );
    const total = countResult.total;

    const books = await sequelize.query(
      `SELECT b.*, c.name AS category_name, c.slug AS category_slug
       FROM books b LEFT JOIN categories c ON b.category_id = c.id
       WHERE (b.title LIKE :search OR b.author LIKE :search OR b.description LIKE :search
              OR b.otherdescription LIKE :search OR b.isbn LIKE :search) ${activeClause}
       ORDER BY b.created_at DESC LIMIT :limit OFFSET :offset`,
      {
        replacements: { search: searchTerm, limit, offset },
        type: QueryTypes.SELECT,
      },
    );

    return {
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      books,
    };
  }
}

export default new BookService();
