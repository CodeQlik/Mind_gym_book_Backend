import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";


class CartService {
  async addToCart(userId, data) {
    const book_id = data.book_id || data.bookId;
    const quantity = data.quantity || 1;

    if (!book_id) throw new Error("Book ID is required.");

    // Check if book exists and is active
    const [book] = await sequelize.query(
      "SELECT id, title, is_active, stock, reserved FROM books WHERE id = :book_id LIMIT 1",
      { replacements: { book_id }, type: QueryTypes.SELECT },
    );
    if (!book) throw new Error("Book not found.");
    if (!book.is_active) throw new Error("This book is not available for purchase.");

    const availableStock = (book.stock || 0) - (book.reserved || 0);

    if (availableStock <= 0) {
      throw new Error(`The book "${book.title}" is currently out of stock.`);
    }

    // Check if item already exists in cart
    const [existingItem] = await sequelize.query(
      "SELECT id, quantity FROM carts WHERE user_id = :userId AND book_id = :book_id LIMIT 1",
      { replacements: { userId, book_id }, type: QueryTypes.SELECT },
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + parseInt(quantity);

      if (newQuantity > availableStock) {
        throw new Error(
          `Only ${availableStock} units of "${book.title}" are available in stock.`,
        );
      }

      await sequelize.query(
        "UPDATE carts SET quantity = :quantity, updated_at = NOW() WHERE id = :id",
        {
          replacements: { quantity: newQuantity, id: existingItem.id },
          type: QueryTypes.UPDATE,
        },
      );
    } else {
      if (parseInt(quantity) > availableStock) {
        throw new Error(
          `Only ${availableStock} units of "${book.title}" are available in stock.`,
        );
      }

      await sequelize.query(
        "INSERT INTO carts (user_id, book_id, quantity, created_at, updated_at) VALUES (:userId, :book_id, :quantity, NOW(), NOW())",
        { replacements: { userId, book_id, quantity }, type: QueryTypes.INSERT },
      );
    }

    // Always fetch the latest item by user_id and book_id to return reliable data
    const [resultItem] = await sequelize.query(
      "SELECT * FROM carts WHERE user_id = :userId AND book_id = :book_id LIMIT 1",
      { replacements: { userId, book_id }, type: QueryTypes.SELECT },
    );
    
    return resultItem;
  }

  async getCart(userId) {
    const items = await sequelize.query(
      `SELECT c.*, 
        b.id AS book_id, b.title, b.slug, b.price, b.thumbnail, b.weight,
        b.tax_applicable, b.tax_type, b.tax_rate,
        cat.name AS category_name
       FROM carts c
       LEFT JOIN books b ON c.book_id = b.id
       LEFT JOIN categories cat ON b.category_id = cat.id
       WHERE c.user_id = :userId
       ORDER BY c.created_at DESC`,
      { replacements: { userId }, type: QueryTypes.SELECT },
    );

    let subtotal = 0;
    let totalTax = 0;
    let totalWeight = 0;

    items.forEach((item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity) || 0;
      const weight = parseFloat(item.weight) || 0.5; // Default 500g if not specified
      const taxRate = parseFloat(item.tax_rate) || 0;

      subtotal += price * qty;
      totalWeight += weight * qty;

      if (item.tax_applicable && item.tax_type === "exclusive") {
        totalTax += (price * qty * taxRate) / 100;
      }
    });

    const shippingCharge = 0;
    const addressFound = false;

    return {
      items,
      summary: {
        subtotal: subtotal.toFixed(2),
        total_tax: totalTax.toFixed(2),
        shipping_charge: shippingCharge.toFixed(2),
        total_amount: (subtotal + totalTax + shippingCharge).toFixed(2),
        address_found: addressFound,
        total_weight: totalWeight.toFixed(3)
      }
    };
  }

  async updateQuantity(userId, cartId, quantity) {
    const [cartItem] = await sequelize.query(
      `SELECT c.id, c.quantity, b.title, b.stock, b.reserved 
       FROM carts c 
       JOIN books b ON c.book_id = b.id 
       WHERE c.id = :cartId AND c.user_id = :userId LIMIT 1`,
      { replacements: { cartId, userId }, type: QueryTypes.SELECT },
    );
    if (!cartItem) throw new Error("The specified cart item was not found.");

    if (quantity < 1) {
      await sequelize.query("DELETE FROM carts WHERE id = :cartId", {
        replacements: { cartId },
        type: QueryTypes.DELETE,
      });
      return { message: "Item removed from cart" };
    }

    const availableStock = (cartItem.stock || 0) - (cartItem.reserved || 0);
    if (quantity > availableStock) {
      throw new Error(
        `Only ${availableStock} units of "${cartItem.title}" are available in stock.`,
      );
    }

    await sequelize.query(
      "UPDATE carts SET quantity = :quantity, updated_at = NOW() WHERE id = :cartId",
      { replacements: { quantity, cartId }, type: QueryTypes.UPDATE },
    );

    const [updated] = await sequelize.query(
      "SELECT * FROM carts WHERE id = :cartId LIMIT 1",
      { replacements: { cartId }, type: QueryTypes.SELECT },
    );
    return updated;
  }

  async removeFromCart(userId, cartId) {
    const [cartItem] = await sequelize.query(
      "SELECT id FROM carts WHERE id = :cartId AND user_id = :userId LIMIT 1",
      { replacements: { cartId, userId }, type: QueryTypes.SELECT },
    );
    if (!cartItem) throw new Error("The specified cart item was not found.");

    await sequelize.query("DELETE FROM carts WHERE id = :cartId", {
      replacements: { cartId },
      type: QueryTypes.DELETE,
    });
    return true;
  }

  async clearCart(userId) {
    await sequelize.query("DELETE FROM carts WHERE user_id = :userId", {
      replacements: { userId },
      type: QueryTypes.DELETE,
    });
    return true;
  }
}

export default new CartService();
