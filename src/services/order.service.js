import { Order, Book, User } from "../models/index.js";

class OrderService {
  async createPhysicalOrder(userId, orderData) {
    const { book_id, quantity, shipping_address } = orderData;

    const book = await Book.findByPk(book_id);
    if (!book) throw new Error("Book not found");

    // Check stock if applicable (Assuming 'stock_count' added to Book model or managed here)
    // For now, assume physical books are available if price is set

    const totalAmount = book.price * (quantity || 1);

    return await Order.create({
      user_id: userId,
      total_amount: totalAmount,
      order_type: "physical_book",
      payment_status: "paid", // Placeholder: Assuming payment is done
      delivery_status: "processing",
      shipping_address,
    });
  }

  async getMyOrders(userId) {
    return await Order.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
    });
  }

  async getAllOrders(status = null) {
    const where = status ? { delivery_status: status } : {};
    return await Order.findAll({
      where,
      include: [{ model: User, as: "user", attributes: ["name", "email"] }],
      order: [["createdAt", "DESC"]],
    });
  }

  async updateOrderStatus(orderId, statusData) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order not found");

    return await order.update(statusData);
  }

  async requestRefund(userId, orderId, reason) {
    const order = await Order.findOne({
      where: { id: orderId, user_id: userId },
    });
    if (!order) throw new Error("Order not found");

    // Check if within 7 days
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - orderDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
      throw new Error("Refund request window (7 days) has expired");
    }

    return await order.update({
      refund_requested: true,
      refund_reason: reason,
    });
  }
}

export default new OrderService();
