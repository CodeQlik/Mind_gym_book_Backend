import { Wishlist, Book, Category } from "../models/index.js";

class WishlistService {
  async addToWishlist(userId, bookId) {
    const book = await Book.findByPk(bookId);
    if (!book) throw new Error("Book not found");

    // Check if already in wishlist
    const existing = await Wishlist.findOne({
      where: { user_id: userId, book_id: bookId },
    });

    if (existing) {
      return existing;
    }

    return await Wishlist.create({
      user_id: userId,
      book_id: bookId,
    });
  }

  async getWishlist(userId) {
    return await Wishlist.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Book,
          as: "book",
          attributes: [
            "id",
            "title",
            "slug",
            "price",
            "thumbnail",
            "is_active",
          ],
          include: [{ model: Category, as: "category", attributes: ["name"] }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  }

  async removeFromWishlist(userId, wishlistId) {
    const item = await Wishlist.findOne({
      where: { id: wishlistId, user_id: userId },
    });

    if (!item) throw new Error("Wishlist item not found");

    await item.destroy();
    return true;
  }

  async toggleWishlist(userId, bookId) {
    const existing = await Wishlist.findOne({
      where: { user_id: userId, book_id: bookId },
    });

    if (existing) {
      await existing.destroy();
      return { action: "removed" };
    } else {
      const book = await Book.findByPk(bookId);
      if (!book) throw new Error("Book not found");

      const newItem = await Wishlist.create({
        user_id: userId,
        book_id: bookId,
      });
      return { action: "added", item: newItem };
    }
  }
}

export default new WishlistService();
