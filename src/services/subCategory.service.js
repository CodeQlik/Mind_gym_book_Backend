import SubCategory from "../models/subCategory.model.js";
import { Category } from "../models/index.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

class SubcategoryService {
  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async createSubCategory(data, file) {
    const { name, description, category_id } = data;
    const slug = this.generateSlug(name);

    const existing = await SubCategory.findOne({ where: { slug } });
    if (existing) throw new Error("Subcategory with this name already exists");

    let imageData = { url: "", public_id: "" };

    if (file && file.path) {
      const uploadResult = await uploadOnCloudinary(file.path);
      if (uploadResult) {
        imageData = {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };
      }
    }

    return await SubCategory.create({
      name,
      description,
      category_id,
      slug,
      image: imageData,
    });
  }

  async getSubCategories(activeOnly = true) {
    const where = {};
    if (activeOnly) where.is_active = true;

    return await SubCategory.findAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
      ],
    });
  }

  async getSubCategoryById(id, activeOnly = true) {
    const subCategory = await SubCategory.findByPk(id, {
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
      ],
    });
    if (!subCategory) throw new Error("Subcategory not found");

    if (activeOnly && !subCategory.is_active) {
      throw new Error("Subcategory is currently inactive");
    }

    return subCategory;
  }

  async updateSubCategory(id, data, file) {
    const subCategory = await SubCategory.findByPk(id);
    if (!subCategory) throw new Error("Subcategory not found");

    const { name, description, category_id, is_active } = data;
    const updateData = {};

    if (name) {
      updateData.name = name;
      updateData.slug = this.generateSlug(name);
    }
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (file && file.path) {
      if (subCategory.image && subCategory.image.public_id) {
        await deleteFromCloudinary(subCategory.image.public_id);
      }
      const uploadResult = await uploadOnCloudinary(file.path);
      if (uploadResult) {
        updateData.image = {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };
      }
    }

    await subCategory.update(updateData);
    return subCategory;
  }

  async deleteSubCategory(id) {
    const subCategory = await SubCategory.findByPk(id);
    if (!subCategory) throw new Error("Subcategory not found");

    if (subCategory.image && subCategory.image.public_id) {
      await deleteFromCloudinary(subCategory.image.public_id);
    }

    await subCategory.destroy();
    return true;
  }

  async getSubCategoriesByCategoryId(category_id, activeOnly = true) {
    const where = { category_id };
    if (activeOnly) {
      where.is_active = true;
    }

    return await SubCategory.findAll({
      where,
      order: [["name", "ASC"]],
    });
  }

  async getSubCategoriesByCategorySlug(slug, activeOnly = true) {
    const category = await Category.findOne({ where: { slug } });
    if (!category) throw new Error("Category not found");

    const where = { category_id: category.id };
    if (activeOnly) {
      where.is_active = true;
    }

    return await SubCategory.findAll({
      where,
      order: [["name", "ASC"]],
    });
  }

  async toggleSubCategoryStatus(id) {
    const subCategory = await SubCategory.findByPk(id);
    if (!subCategory) throw new Error("Subcategory not found");

    subCategory.is_active = !subCategory.is_active;
    await subCategory.save();
    return subCategory;
  }

  async searchSubCategories(query, activeOnly = true) {
    const { Op } = (await import("sequelize")).default;
    const where = {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { description: { [Op.like]: `%${query}%` } },
      ],
    };

    if (activeOnly) where.is_active = true;

    return await SubCategory.findAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
      ],
      order: [["name", "ASC"]],
    });
  }
}

export default new SubcategoryService();
