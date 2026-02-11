import { Cart, Book, Category } from "../models/index.js";

class CartService {
  async addToCart(userId, data) {
    const { book_id, quantity = 1 } = data;

    // Check if book exists
    const book = await Book.findByPk(book_id);
    if (!book) throw new Error("Book not found");

    if (!book.is_active) throw new Error("Book is not available for purchase");

    // Check if item already exists in cart for this user
    const existingItem = await Cart.findOne({
      where: { user_id: userId, book_id },
    });

    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
      await existingItem.save();
      return existingItem;
    }

    return await Cart.create({
      user_id: userId,
      book_id,
      quantity,
    });
  }

  async getCart(userId) {
    return await Cart.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Book,
          as: "book",
          attributes: ["id", "title", "slug", "price", "thumbnail"],
          include: [{ model: Category, as: "category", attributes: ["name"] }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  }

  async updateQuantity(userId, cartId, quantity) {
    const cartItem = await Cart.findOne({
      where: { id: cartId, user_id: userId },
    });

    if (!cartItem) throw new Error("Cart item not found");

    if (quantity < 1) {
      await cartItem.destroy();
      return { message: "Item removed from cart" };
    }

    cartItem.quantity = quantity;
    await cartItem.save();
    return cartItem;
  }

  async removeFromCart(userId, cartId) {
    const cartItem = await Cart.findOne({
      where: { id: cartId, user_id: userId },
    });

    if (!cartItem) throw new Error("Cart item not found");

    await cartItem.destroy();
    return true;
  }

  async clearCart(userId) {
    await Cart.destroy({ where: { user_id: userId } });
    return true;
  }
}

export default new CartService();
