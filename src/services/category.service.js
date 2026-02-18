import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

class CategoryService {
  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async createCategory(data, file) {
    const { name, description } = data;
    const slug = this.generateSlug(name);

    const [existing] = await sequelize.query(
      "SELECT id FROM categories WHERE slug = :slug LIMIT 1",
      { replacements: { slug }, type: QueryTypes.SELECT },
    );
    if (existing) throw new Error("Category with this name already exists");

    let imageData = { url: "", public_id: "" };

    if (file && file.path) {
      try {
        const uploadResult = await uploadOnCloudinary(file.path);
        if (uploadResult?.secure_url) {
          imageData = {
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
          };
        } else {
          console.error(
            "Cloudinary upload failed or returned invalid response",
          );
        }
      } catch (uploadError) {
        console.error("Error during Cloudinary process:", uploadError.message);
      }
    } else {
      console.warn(
        "No valid file path found in request. Check field name 'image'.",
      );
    }

    const [, meta] = await sequelize.query(
      `INSERT INTO categories (name, description, slug, image, is_active, created_at, updated_at)
       VALUES (:name, :description, :slug, :image, 1, NOW(), NOW())`,
      {
        replacements: {
          name,
          description: description || null,
          slug,
          image: JSON.stringify(imageData),
        },
        type: QueryTypes.INSERT,
      },
    );

    const [category] = await sequelize.query(
      "SELECT * FROM categories WHERE id = :id LIMIT 1",
      { replacements: { id: meta }, type: QueryTypes.SELECT },
    );
    return category;
  }

  async updateCategory(id, data, file) {
    const [category] = await sequelize.query(
      "SELECT * FROM categories WHERE id = :id LIMIT 1",
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    if (!category) throw new Error("Category not found");

    const { name, description, is_active } = data;
    const setClauses = ["updated_at = NOW()"];
    const replacements = { id };

    if (name) {
      setClauses.push("name = :name", "slug = :slug");
      replacements.name = name;
      replacements.slug = this.generateSlug(name);
    }
    if (description !== undefined) {
      setClauses.push("description = :description");
      replacements.description = description;
    }
    if (is_active !== undefined) {
      setClauses.push("is_active = :is_active");
      replacements.is_active = is_active;
    }

    if (file) {
      let currentImage = category.image;
      if (typeof currentImage === "string") {
        try {
          currentImage = JSON.parse(currentImage);
        } catch {
          currentImage = {};
        }
      }
      if (currentImage?.public_id)
        await deleteFromCloudinary(currentImage.public_id);

      const uploadResult = await uploadOnCloudinary(file.path, "categories");
      if (uploadResult) {
        setClauses.push("image = :image");
        replacements.image = JSON.stringify({
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        });
      }
    }

    await sequelize.query(
      `UPDATE categories SET ${setClauses.join(", ")} WHERE id = :id`,
      { replacements, type: QueryTypes.UPDATE },
    );

    const [updated] = await sequelize.query(
      "SELECT * FROM categories WHERE id = :id LIMIT 1",
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    return updated;
  }

  async deleteCategory(id) {
    const [category] = await sequelize.query(
      "SELECT * FROM categories WHERE id = :id LIMIT 1",
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    if (!category) throw new Error("Category not found");

    let image = category.image;
    if (typeof image === "string") {
      try {
        image = JSON.parse(image);
      } catch {
        image = {};
      }
    }
    if (image?.public_id) await deleteFromCloudinary(image.public_id);

    await sequelize.query("DELETE FROM categories WHERE id = :id", {
      replacements: { id },
      type: QueryTypes.DELETE,
    });
    return true;
  }

  async getCategories(activeOnly = true) {
    const whereClause = activeOnly ? "WHERE is_active = 1" : "";
    return await sequelize.query(
      `SELECT * FROM categories ${whereClause} ORDER BY created_at DESC`,
      { type: QueryTypes.SELECT },
    );
  }

  async getCategoryById(id, activeOnly = true) {
    const activeClause = activeOnly ? "AND is_active = 1" : "";
    const [category] = await sequelize.query(
      `SELECT * FROM categories WHERE id = :id ${activeClause} LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    if (!category)
      throw new Error(
        activeOnly ? "Category not found or inactive" : "Category not found",
      );
    return category;
  }

  async getCategoryBySlug(slug, activeOnly = true) {
    const activeClause = activeOnly ? "AND is_active = 1" : "";
    const [category] = await sequelize.query(
      `SELECT * FROM categories WHERE slug = :slug ${activeClause} LIMIT 1`,
      { replacements: { slug }, type: QueryTypes.SELECT },
    );
    if (!category)
      throw new Error(
        activeOnly ? "Category not found or inactive" : "Category not found",
      );
    return category;
  }

  async toggleCategoryStatus(id) {
    const [category] = await sequelize.query(
      "SELECT id, is_active FROM categories WHERE id = :id LIMIT 1",
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    if (!category) throw new Error("Category not found");

    const newStatus = category.is_active ? 0 : 1;
    await sequelize.query(
      "UPDATE categories SET is_active = :is_active, updated_at = NOW() WHERE id = :id",
      { replacements: { is_active: newStatus, id }, type: QueryTypes.UPDATE },
    );

    const [updated] = await sequelize.query(
      "SELECT * FROM categories WHERE id = :id LIMIT 1",
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    return updated;
  }

  async searchCategories(query, activeOnly = true) {
    const searchTerm = `%${query}%`;
    const activeClause = activeOnly ? "AND is_active = 1" : "";
    return await sequelize.query(
      `SELECT * FROM categories
       WHERE (name LIKE :search OR description LIKE :search) ${activeClause}
       ORDER BY created_at DESC`,
      { replacements: { search: searchTerm }, type: QueryTypes.SELECT },
    );
  }
}

export default new CategoryService();
