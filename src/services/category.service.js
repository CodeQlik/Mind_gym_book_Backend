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

    async getCategories() {
        return await Category.findAll({
            where: {
                parent_id: null,
                is_active: true
            },
            include: [
                {
                    model: Category,
                    as: 'children',
                    where: { is_active: true },
                    required: false,
                    include: [
                        {
                            model: Category,
                            as: 'children',
                            where: { is_active: true },
                            required: false
                        }
                    ]
                }
            ]
        });
    }

    async getCategoryById(id) {
        const category = await Category.findOne({
            where: { id, is_active: true },
            include: [
                {
                    model: Category,
                    as: 'children',
                    where: { is_active: true },
                    required: false
                }
            ]
        });
        if (!category) throw new Error("Category not found or inactive");
        return category;
    }

    async getCategoriesByParentId(parent_id) {
        return await Category.findAll({
            where: {
                parent_id: parent_id || null,
                is_active: true
            }
        });
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
