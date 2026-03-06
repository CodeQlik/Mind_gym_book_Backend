import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";

class WishlistService {
  async addToWishlist(userId, bookId) {
    const [book] = await sequelize.query(
      "SELECT id FROM books WHERE id = :bookId LIMIT 1",
      { replacements: { bookId }, type: QueryTypes.SELECT },
    );
    if (!book) throw new Error("Book not found");

    // Check if already in wishlist
    const [existing] = await sequelize.query(
      "SELECT id FROM wishlists WHERE user_id = :userId AND book_id = :bookId LIMIT 1",
      { replacements: { userId, bookId }, type: QueryTypes.SELECT },
    );
    if (existing) return existing;

    const [, meta] = await sequelize.query(
      "INSERT INTO wishlists (user_id, book_id, created_at, updated_at) VALUES (:userId, :bookId, NOW(), NOW())",
      { replacements: { userId, bookId }, type: QueryTypes.INSERT },
    );

    const [newItem] = await sequelize.query(
      "SELECT * FROM wishlists WHERE id = :id LIMIT 1",
      { replacements: { id: meta }, type: QueryTypes.SELECT },
    );
    return newItem;
  }

  async getWishlist(userId) {
    return await sequelize.query(
      `SELECT w.*,
        b.id AS book_id, b.title, b.slug, b.price, b.thumbnail, b.is_active,
        cat.name AS category_name
       FROM wishlists w
       LEFT JOIN books b ON w.book_id = b.id
       LEFT JOIN categories cat ON b.category_id = cat.id
       WHERE w.user_id = :userId
       ORDER BY w.created_at DESC`,
      { replacements: { userId }, type: QueryTypes.SELECT },
    );
  }

  async removeFromWishlist(userId, wishlistId) {
    const [item] = await sequelize.query(
      "SELECT id FROM wishlists WHERE id = :wishlistId AND user_id = :userId LIMIT 1",
      { replacements: { wishlistId, userId }, type: QueryTypes.SELECT },
    );
    if (!item) throw new Error("Wishlist item not found");

    await sequelize.query("DELETE FROM wishlists WHERE id = :wishlistId", {
      replacements: { wishlistId },
      type: QueryTypes.DELETE,
    });
    return true;
  }

  async toggleWishlist(userId, bookId) {
    const [existing] = await sequelize.query(
      "SELECT id FROM wishlists WHERE user_id = :userId AND book_id = :bookId LIMIT 1",
      { replacements: { userId, bookId }, type: QueryTypes.SELECT },
    );

    if (existing) {
      await sequelize.query("DELETE FROM wishlists WHERE id = :id", {
        replacements: { id: existing.id },
        type: QueryTypes.DELETE,
      });
      return { action: "removed" };
    }

    const [book] = await sequelize.query(
      "SELECT id FROM books WHERE id = :bookId LIMIT 1",
      { replacements: { bookId }, type: QueryTypes.SELECT },
    );
    if (!book) throw new Error("Book not found");

    const [, meta] = await sequelize.query(
      "INSERT INTO wishlists (user_id, book_id, created_at, updated_at) VALUES (:userId, :bookId, NOW(), NOW())",
      { replacements: { userId, bookId }, type: QueryTypes.INSERT },
    );

    const [newItem] = await sequelize.query(
      "SELECT * FROM wishlists WHERE id = :id LIMIT 1",
      { replacements: { id: meta }, type: QueryTypes.SELECT },
    );
    return { action: "added", item: newItem };
  }
}

export default new WishlistService();
