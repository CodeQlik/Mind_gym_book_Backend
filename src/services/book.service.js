import { Book, Category } from '../models/index.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

class BookService {
    generateSlug(title) {
        return title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-')  // Replace spaces/underscores with -
            .replace(/^-+|-+$/g, '');   // Trim - from ends
    }

    async createBook(data, file) {
        const { title, description, price, category_id, is_active } = data;

        // Verify if category exists
        const category = await Category.findByPk(category_id);
        if (!category) {
            throw new Error("Invalid category ID");
        }

        const slug = this.generateSlug(title);

        const existingBook = await Book.findOne({ where: { slug } });
        if (existingBook) {
            throw new Error("A book with this title already exists (slug conflict)");
        }

        let thumbnailData = { url: "", public_id: "" };
        if (file) {
            const uploadResult = await uploadOnCloudinary(file.path, 'books/thumbnails');
            if (uploadResult) {
                thumbnailData = {
                    url: uploadResult.secure_url,
                    public_id: uploadResult.public_id
                };
            }
        }

        const book = await Book.create({
            title,
            slug,
            description,
            price,
            thumbnail: thumbnailData,
            category_id,
            is_active: is_active !== undefined ? is_active : true
        });

        return book;
    }

    async getBooks(filters = {}) {
        return await Book.findAll({
            where: filters,
            include: [{ model: Category, as: 'category', attributes: ['name', 'slug'] }],
            order: [['createdAt', 'DESC']]
        });
    }

    async getBooksByCategoryId(category_id, activeOnly = true) {
        const where = { category_id };
        if (activeOnly) where.is_active = true;

        return await Book.findAll({
            where,
            include: [{ model: Category, as: 'category', attributes: ['name', 'slug'] }],
            order: [['createdAt', 'DESC']]
        });
    }

    async getBookBySlug(slug, activeOnly = true) {
        const where = { slug };
        if (activeOnly) where.is_active = true;

        const book = await Book.findOne({
            where,
            include: [{ model: Category, as: 'category', attributes: ['name', 'slug'] }]
        });
        if (!book) throw new Error(activeOnly ? "Book not found or inactive" : "Book not found");
        return book;
    }

    async getBookById(id, activeOnly = true) {
        const where = { id };
        if (activeOnly) where.is_active = true;

        const book = await Book.findOne({
            where,
            include: [{ model: Category, as: 'category', attributes: ['name', 'slug'] }]
        });
        if (!book) throw new Error("Book not found or inactive");
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

        if (file) {
            // Delete old thumbnail if it exists
            if (book.thumbnail && book.thumbnail.public_id) {
                await deleteFromCloudinary(book.thumbnail.public_id);
            }
            // Upload new thumbnail
            const uploadResult = await uploadOnCloudinary(file.path, 'books/thumbnails');
            if (uploadResult) {
                data.thumbnail = {
                    url: uploadResult.secure_url,
                    public_id: uploadResult.public_id
                };
            }
        }

        await book.update(data);
        return book;
    }

    async deleteBook(id) {
        const book = await Book.findByPk(id);
        if (!book) throw new Error("Book not found");

        // Delete thumbnail from Cloudinary
        if (book.thumbnail && book.thumbnail.public_id) {
            await deleteFromCloudinary(book.thumbnail.public_id);
        }

        await book.destroy();
        return true;
    }
}

export default new BookService();
