import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";
import { Order, OrderItem, Book, User, Cart } from "../models/index.js";

class OrderService {
  async createOrderFromCart(userId, { address_id }) {
    if (!address_id) throw new Error("address_id is required");

    // 1. Get user's cart with book details
    const cartItems = await Cart.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Book,
          as: "book",
          attributes: ["id", "title", "price", "stock", "is_active"],
        },
      ],
    });

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Cart is empty. Add books before placing an order.");
    }

    // 2. Validate stock and activity for all items
    for (const item of cartItems) {
      if (!item.book)
        throw new Error(`Book not found for cart item ${item.id}`);
      if (!item.book.is_active)
        throw new Error(`Book "${item.book.title}" is currently unavailable`);
      if (item.book.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${item.book.title}". Available: ${item.book.stock}, Requested: ${item.quantity}`,
        );
      }
    }

    // 3. Fetch and snapshot the shipping address using raw SQL
    // (addresses are linked to users via JSON address_ids column, not a direct FK)
    const [address] = await sequelize.query(
      "SELECT * FROM addresses WHERE id = :address_id LIMIT 1",
      { replacements: { address_id }, type: QueryTypes.SELECT },
    );
    if (!address) throw new Error("Shipping address not found");

    const addressSnapshot = [
      address.name ? `${address.name}, ` : "",
      address.address_line1 || address.street || "",
      address.address_line2 ? `, ${address.address_line2}` : "",
      `, ${address.city}`,
      `, ${address.state}`,
      ` - ${address.pincode || address.pin_code}`,
      `, ${address.country || "India"}`,
    ].join("");

    // 4. Calculate total
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + parseFloat(item.book.price) * item.quantity;
    }, 0);

    // 5. Create Order + OrderItems in a transaction
    const order = await sequelize.transaction(async (t) => {
      const newOrder = await Order.create(
        {
          user_id: userId,
          address_id,
          shipping_address: addressSnapshot,
          total_amount: totalAmount.toFixed(2),
          order_type: "physical_book",
          payment_status: "pending",
          delivery_status: "processing",
        },
        { transaction: t },
      );

      // Create order items
      const itemsPayload = cartItems.map((item) => ({
        order_id: newOrder.id,
        book_id: item.book_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.book.price),
        subtotal: parseFloat(
          (parseFloat(item.book.price) * item.quantity).toFixed(2),
        ),
      }));

      await OrderItem.bulkCreate(itemsPayload, { transaction: t });

      // Deduct stock
      for (const item of cartItems) {
        await Book.update(
          { stock: sequelize.literal(`stock - ${item.quantity}`) },
          { where: { id: item.book_id }, transaction: t },
        );
      }

      // Clear cart
      await Cart.destroy({ where: { user_id: userId }, transaction: t });

      return newOrder;
    });

    // Return order with items
    return await this._getOrderWithDetails(order.id);
  }

  /**
   * Link Razorpay order ID to the DB order (called after Razorpay order creation)
   */
  async linkRazorpayOrder(orderId, razorpayOrderId) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order not found");
    await order.update({ razorpay_order_id: razorpayOrderId });
    return order;
  }

  /**
   * Mark order as PAID (called by payment verification webhook/verify endpoint)
   */
  async markOrderPaid(razorpayOrderId) {
    const order = await Order.findOne({
      where: { razorpay_order_id: razorpayOrderId },
    });
    if (!order) return null; // not a physical order, skip
    await order.update({ payment_status: "paid" });
    return order;
  }

  /**
   * USER: Get my orders with full details
   */
  async getMyOrders(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Order.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Book,
              as: "book",
              attributes: ["id", "title", "slug", "author", "thumbnail"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      orders: rows,
    };
  }

  /**
   * USER: Get single order detail
   */
  async getOrderById(orderId, userId) {
    const where = { id: orderId };
    if (userId) where.user_id = userId; // users can only see their own orders
    const order = await this._getOrderWithDetails(orderId, where);
    if (!order) throw new Error("Order not found");
    return order;
  }

  /**
   * ADMIN: Get all orders with filters and pagination
   */
  async getAllOrders(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const where = {};
    if (filters.delivery_status)
      where.delivery_status = filters.delivery_status;
    if (filters.payment_status) where.payment_status = filters.payment_status;

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Book,
              as: "book",
              attributes: ["id", "title", "slug", "author", "thumbnail"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      orders: rows,
    };
  }

  /**
   * ADMIN: Dispatch an order — set tracking ID, courier name, shipped status
   */
  async dispatchOrder(orderId, { tracking_id, courier_name, dispatch_note }) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order not found");

    if (order.payment_status !== "paid") {
      throw new Error("Cannot dispatch an unpaid order");
    }
    if (
      order.delivery_status === "shipped" ||
      order.delivery_status === "delivered"
    ) {
      throw new Error(`Order already ${order.delivery_status}`);
    }

    await order.update({
      delivery_status: "shipped",
      tracking_id: tracking_id || null,
      courier_name: courier_name || null,
      dispatch_note: dispatch_note || null,
    });

    return await this._getOrderWithDetails(order.id);
  }

  /**
   * ADMIN: Update any order status field
   */
  async updateOrderStatus(orderId, statusData) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order not found");

    const allowed = [
      "delivery_status",
      "payment_status",
      "tracking_id",
      "courier_name",
      "dispatch_note",
    ];
    const updates = {};
    for (const key of allowed) {
      if (statusData[key] !== undefined) updates[key] = statusData[key];
    }

    await order.update(updates);
    return await this._getOrderWithDetails(order.id);
  }

  /**
   * USER: Request a refund (within 7 days of order)
   */
  async requestRefund(userId, orderId, reason) {
    const order = await Order.findOne({
      where: { id: orderId, user_id: userId },
    });
    if (!order) throw new Error("Order not found");

    if (order.refund_requested) {
      throw new Error("Refund already requested for this order");
    }

    const orderDate = new Date(order.created_at);
    const now = new Date();
    const diffDays = Math.ceil(
      Math.abs(now - orderDate) / (1000 * 60 * 60 * 24),
    );

    if (diffDays > 7) {
      throw new Error("Refund request window (7 days) has expired");
    }

    await order.update({ refund_requested: true, refund_reason: reason });
    return order;
  }

  //  Private Helpers

  async _getOrderWithDetails(orderId, extraWhere = {}) {
    return await Order.findOne({
      where: { id: orderId, ...extraWhere },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Book,
              as: "book",
              attributes: [
                "id",
                "title",
                "slug",
                "author",
                "thumbnail",
                "price",
              ],
            },
          ],
        },
      ],
    });
  }
}

export default new OrderService();
