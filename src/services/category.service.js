import { Category } from '../models/index.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

class CategoryService {
    generateSlug(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-')  // Replace spaces/underscores with -
            .replace(/^-+|-+$/g, '');   // Trim - from ends
    }

    async createCategory(data, file) {
        const { name, description, parent_id } = data;
        const slug = this.generateSlug(name);

        const existingCategory = await Category.findOne({ where: { slug } });
        if (existingCategory) {
            throw new Error("Category with this name already exists");
        }

        let imageData = { url: "", public_id: "" };
        if (file) {
            const uploadResult = await uploadOnCloudinary(file.path, 'categories');
            if (uploadResult) {
                imageData = {
                    url: uploadResult.secure_url,
                    public_id: uploadResult.public_id
                };
            }
        }

        return await Category.create({
            name,
            description,
            slug,
            image: imageData,
            parent_id: parent_id || null
        });
    }

    async updateCategory(id, data, file) {
        const category = await Category.findByPk(id);
        if (!category) throw new Error("Category not found");

        const { name, description, parent_id, is_active } = data;
        const updateData = {};

        if (name) {
            updateData.name = name;
            updateData.slug = this.generateSlug(name);
        }
        if (description !== undefined) updateData.description = description;
        if (parent_id !== undefined) updateData.parent_id = parent_id || null;
        if (is_active !== undefined) updateData.is_active = is_active;

        if (file) {
            // Delete old image if it exists
            if (category.image && category.image.public_id) {
                await deleteFromCloudinary(category.image.public_id);
            }
            // Upload new image
            const uploadResult = await uploadOnCloudinary(file.path, 'categories');
            if (uploadResult) {
                updateData.image = {
                    url: uploadResult.secure_url,
                    public_id: uploadResult.public_id
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
        const where = { parent_id: null };
        if (activeOnly) where.is_active = true;

        const include = [
            {
                model: Category,
                as: 'children',
                required: false,
                include: [
                    {
                        model: Category,
                        as: 'children',
                        required: false
                    }
                ]
            }
        ];

        if (activeOnly) {
            include[0].where = { is_active: true };
            include[0].include[0].where = { is_active: true };
        }

        return await Category.findAll({
            where,
            include
        });
    }

    async getCategoryById(id, activeOnly = true) {
        const where = { id };
        if (activeOnly) where.is_active = true;

        const include = [
            {
                model: Category,
                as: 'children',
                required: false
            }
        ];

        if (activeOnly) {
            include[0].where = { is_active: true };
        }

        const category = await Category.findOne({
            where,
            include
        });

        if (!category) throw new Error(activeOnly ? "Category not found or inactive" : "Category not found");
        return category;
    }

    async getCategoriesByParentId(parent_id, activeOnly = true) {
        const where = { parent_id: parent_id || null };
        if (activeOnly) where.is_active = true;

        return await Category.findAll({
            where
        });
    }

    async getCategoryBySlug(slug, activeOnly = true) {
        const where = { slug };
        if (activeOnly) where.is_active = true;

        const include = [
            {
                model: Category,
                as: 'children',
                required: false,
                include: [
                    {
                        model: Category,
                        as: 'children',
                        required: false
                    }
                ]
            }
        ];

        if (activeOnly) {
            include[0].where = { is_active: true };
            include[0].include[0].where = { is_active: true };
        }

        const category = await Category.findOne({
            where,
            include
        });

        if (!category) throw new Error(activeOnly ? "Category not found or inactive" : "Category not found");
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
