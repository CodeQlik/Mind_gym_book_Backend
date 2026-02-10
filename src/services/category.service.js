import { Category } from "../models/index.js";
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

    const existingCategory = await Category.findOne({ where: { slug } });
    if (existingCategory) {
      throw new Error("Category with this name already exists");
    }

    let imageData = { url: "", public_id: "" };

    // Check if file exists and has a path (from Multer)
    if (file && file.path) {
      try {
        const uploadResult = await uploadOnCloudinary(file.path);

        if (uploadResult && uploadResult.secure_url) {
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

    return await Category.create({
      name,
      description,
      slug,
      image: imageData,
    });
  }

  async updateCategory(id, data, file) {
    const category = await Category.findByPk(id);
    if (!category) throw new Error("Category not found");

    const { name, description, is_active } = data;
    const updateData = {};

    if (name) {
      updateData.name = name;
      updateData.slug = this.generateSlug(name);
    }
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (file) {
      // Delete old image if it exists
      if (category.image && category.image.public_id) {
        await deleteFromCloudinary(category.image.public_id);
      }
      // Upload new image
      const uploadResult = await uploadOnCloudinary(file.path, "categories");
      if (uploadResult) {
        updateData.image = {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };
      }
    }

    await category.update(updateData);
    return category;
  }

  async deleteCategory(id) {
    const category = await Category.findByPk(id);
    if (!category) throw new Error("Category not found");

    // Delete from Cloudinary
    if (category.image && category.image.public_id) {
      await deleteFromCloudinary(category.image.public_id);
    }

    await category.destroy();
    return true;
  }

  async getCategories(activeOnly = true) {
    const where = {};
    if (activeOnly) where.is_active = true;

    return await Category.findAll({
      where,
    });
  }

  async getCategoryById(id, activeOnly = true) {
    const where = { id };
    if (activeOnly) where.is_active = true;

    const category = await Category.findOne({
      where,
    });

    if (!category)
      throw new Error(
        activeOnly ? "Category not found or inactive" : "Category not found",
      );
    return category;
  }

  async getCategoryBySlug(slug, activeOnly = true) {
    const where = { slug };
    if (activeOnly) where.is_active = true;

    const category = await Category.findOne({
      where,
    });

    if (!category)
      throw new Error(
        activeOnly ? "Category not found or inactive" : "Category not found",
      );
    return category;
  }

  async toggleCategoryStatus(id) {
    const category = await Category.findByPk(id);
    if (!category) throw new Error("Category not found");

    category.is_active = !category.is_active;
    await category.save();
    return category;
  }
}

export default new CategoryService();
