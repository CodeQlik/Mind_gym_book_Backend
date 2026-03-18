import sequelize from "../config/db.js";
import { QueryTypes, Op } from "sequelize";
import { Order, OrderItem, Book, User, Cart, Coupon, Address } from "../models/index.js";
import notificationService from "./notification.service.js";
import couponService from "./coupon.service.js";
import shiprocketService from "./shiprocket.service.js";
import logger from "../utils/logger.js";

class OrderService {
  async createOrderFromCart(
    userId,
    { address_id, payment_method = "prepaid", coupon_code },
  ) {
    // This is now primarily for COD orders or as a wrapper
    const orderData = await this.prepareOrderData(userId, {
      address_id,
      payment_method,
      coupon_code,
    });

    if (payment_method === "cod") {
      return await this.finalizeOrder(orderData);
    }

    // For Prepaid, we just return the data to be used by PaymentService
    return orderData;
  }

  /**
   * 1. Validate and Prepare Order Data (Doesn't save to DB)
   */
  async prepareOrderData(
    userId,
    { address_id, payment_method = "prepaid", coupon_code },
  ) {
    if (!address_id) throw new Error("Shipping address ID is required.");

    const VALID_PAYMENT_METHODS = ["upi", "card", "prepaid", "cod"];
    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      throw new Error(
        `Invalid payment method. Allowed methods: ${VALID_PAYMENT_METHODS.join(", ")}`,
      );
    }

    // 1. Get user's cart
    const cartItems = await Cart.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Book,
          as: "book",
          attributes: ["id", "title", "price", "stock", "reserved", "is_active"],
        },
      ],
    });

    if (!cartItems || cartItems.length === 0) {
      throw new Error("The cart is empty. Please add books to your cart before placing an order.");
    }

    // 2. Validate stock and activity
    for (const item of cartItems) {
      if (!item.book)
        throw new Error(`Book not found for cart item #${item.id}.`);
      if (!item.book.is_active)
        throw new Error(`The book "${item.book.title}" is currently unavailable.`);

      const available = (item.book.stock || 0) - (item.book.reserved || 0);
      if (available < item.quantity) {
        throw new Error(
          `Insufficient stock available for "${item.book.title}". Available: ${available}, Requested: ${item.quantity}.`,
        );
      }
    }

    // 3. Address snapshot
    const [address] = await sequelize.query(
      "SELECT * FROM addresses WHERE id = :address_id LIMIT 1",
      { replacements: { address_id }, type: QueryTypes.SELECT },
    );
    if (!address) throw new Error("The specified shipping address was not found.");

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
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + parseFloat(item.book.price) * item.quantity;
    }, 0);

    let totalAmount = subtotal;
    let discountAmount = 0;
    let couponId = null;

    if (coupon_code) {
      const validation = await couponService.validateCoupon(
        coupon_code,
        subtotal,
      );
      couponId = validation.coupon_id;
      discountAmount = validation.discount_amount;
      totalAmount = validation.total_amount;
    }

    return {
      userId,
      address_id,
      shipping_address: addressSnapshot,
      subtotal_amount: subtotal.toFixed(2),
      discount_amount: discountAmount.toFixed(2),
      total_amount: totalAmount.toFixed(2),
      coupon_id: couponId,
      order_type: "physical_book",
      payment_method,
      items: cartItems.map((item) => ({
        book_id: item.book_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.book.price),
        subtotal: parseFloat(
          (parseFloat(item.book.price) * item.quantity).toFixed(2),
        ),
      })),
    };
  }

  /**
   * 2. Finalize and Save Order to DB (Called after payment or for COD)
   */
  async finalizeOrder(orderData, razorpayOrderId = null) {
    const {
      userId,
      address_id,
      shipping_address,
      subtotal_amount,
      discount_amount,
      total_amount,
      coupon_id,
      order_type,
      payment_method,
      items,
    } = orderData;

    const order = await sequelize.transaction(async (t) => {
      // Create Order
      const newOrder = await Order.create(
        {
          user_id: userId,
          address_id,
          shipping_address,
          subtotal_amount,
          discount_amount,
          total_amount,
          coupon_id,
          order_type,
          payment_method,
          payment_status: payment_method === "cod" ? "pending" : "paid",
          delivery_status: "processing",
          razorpay_order_id: razorpayOrderId,
        },
        { transaction: t },
      );

      // Coupon Usage
      if (coupon_id) {
        await Coupon.update(
          { used_count: sequelize.literal("used_count + 1") },
          { where: { id: coupon_id }, transaction: t },
        );
      }

      // Order Items
      const itemsPayload = items.map((item) => ({
        order_id: newOrder.id,
        ...item,
      }));
      await OrderItem.bulkCreate(itemsPayload, { transaction: t });

      // Inventory adjustment (Reserve for COD, DEDUCT later during dispatch)
      // Actually, standard flow: if PAID, we don't 'reserve', we just track.
      for (const item of items) {
        await Book.update(
          { reserved: sequelize.literal(`reserved + ${item.quantity}`) },
          { where: { id: item.book_id }, transaction: t },
        );
      }

      // Clear cart
      await Cart.destroy({ where: { user_id: userId }, transaction: t });

      return newOrder;
    });
    // Notify user
    const orderWithDetails = await this._getOrderWithDetails(order.id);
    try {
      const payment_method = order.payment_method;
      const userId = order.user_id;

      await notificationService.sendToUser(
        userId,
        "ORDER_CREATED",
        payment_method === "cod"
          ? "📦 Order Placed (COD)!"
          : "📦 Order Confirmed!",
        `Your order ${orderWithDetails.order_no} has been ${payment_method === "cod" ? "placed" : "successfully paid and recorded"}.`,
        { order_id: String(order.id), order_no: orderWithDetails.order_no },
      );
    } catch (err) {
      logger.error("Notification failed for order:", order.id, err.message);
    }

    // 3. AUTOMATION: Sync with Shiprocket automatically
    await this._syncOrderWithShiprocket(order.id);

    // Return the FINAL updated object
    return await this._getOrderWithDetails(order.id);
  }

  /**
   * Link Razorpay order ID to the DB order (called after Razorpay order creation)
   */
  async linkRazorpayOrder(orderId, razorpayOrderId) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("The specified order was not found.");
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

    // Notify user about payment success
    try {
      await notificationService.sendToUser(
        order.user_id,
        "ORDER_PAID",
        "💰 Payment Received!",
        `We have received the payment for your order ${order.order_no}. We'll start processing it soon.`,
        { order_id: String(order.id), order_no: order.order_no },
      );
    } catch (notifError) {}

    // 2. AUTOMATION: Sync with Shiprocket (if not already synced)
    await this._syncOrderWithShiprocket(order.id);

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
      order: [["createdAt", "DESC"]],
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
    if (!order) throw new Error("The specified order was not found.");
    return order;
  }

  /**
   * ADMIN: Get all orders with filters, search and pagination
   */
  async getAllOrders(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const where = {};
    if (filters.delivery_status)
      where.delivery_status = filters.delivery_status;
    if (filters.payment_status) where.payment_status = filters.payment_status;

    // User search filter (via association on users table)
    const userWhere = {};
    if (filters.search) {
      userWhere[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } },
        { phone: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    // Order ID search — support both numeric (4) and formatted (ORD-000004)
    if (filters.search) {
      let searchId = null;
      if (!isNaN(filters.search)) {
        searchId = parseInt(filters.search);
      } else if (
        filters.search.toUpperCase().startsWith("ORD-") &&
        !isNaN(filters.search.split("-")[1])
      ) {
        searchId = parseInt(filters.search.split("-")[1]);
      }

      if (searchId) {
        where[Op.or] = [{ id: searchId }];
      }
    }

    const hasUserSearch = Object.keys(userWhere).length > 0;

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"],
          where: hasUserSearch ? userWhere : undefined,
          required: hasUserSearch,
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
        {
          model: Coupon,
          as: "coupon",
          attributes: ["id", "code"],
        },
      ],
      order: [["createdAt", "DESC"]],
      distinct: true,
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
   * ADMIN: Get order counts grouped by delivery_status (for tab badges)
   * Returns: { all, processing, shipped, delivered, cancelled, returned }
   */
  async getOrderStats() {
    const [totalResult] = await sequelize.query(
      "SELECT COUNT(*) AS total FROM orders",
      { type: QueryTypes.SELECT },
    );

    const statusCounts = await sequelize.query(
      `SELECT delivery_status, COUNT(*) AS count FROM orders GROUP BY delivery_status`,
      { type: QueryTypes.SELECT },
    );

    const stats = {
      all: parseInt(totalResult.total),
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    };

    for (const row of statusCounts) {
      if (stats.hasOwnProperty(row.delivery_status)) {
        stats[row.delivery_status] = parseInt(row.count);
      }
    }

    return stats;
  }

  /**
   * ADMIN: Search orders by order ID, user name, email or phone
   */
  async searchOrders(query, page = 1, limit = 10) {
    return await this.getAllOrders({ search: query }, page, limit);
  }

  /**
   * ADMIN: Dispatch an order — set tracking ID, courier name, shipped status
   */
  async dispatchOrder(orderId, { tracking_id, courier_name, tracking_url }) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order not found");

    if (!tracking_id) {
      throw new Error("Tracking ID is required to dispatch the order.");
    }

    // Allow dispatch if:
    // 1. Payment is already 'paid' (Online)
    // 2. Payment method is 'cod' (Amber/Pending status is valid for COD dispatch)
    if (order.payment_status !== "paid" && order.payment_method !== "cod") {
      throw new Error(
        "Cannot dispatch an unpaid order. Only prepaid or COD orders can be dispatched.",
      );
    }
    if (
      order.delivery_status === "shipped" ||
      order.delivery_status === "delivered"
    ) {
      throw new Error(`This order has already been ${order.delivery_status}.`);
    }

    await sequelize.transaction(async (t) => {
      await order.update(
        {
          delivery_status: "shipped",
          tracking_id: tracking_id || null,
          courier_name: courier_name || null,
          tracking_url: tracking_url || null,
        },
        { transaction: t },
      );

      // Finalize inventory: Deduct total stock AND clear reservation
      const items = await OrderItem.findAll({ where: { order_id: order.id } });
      for (const item of items) {
        await Book.update(
          {
            stock: sequelize.literal(`stock - ${item.quantity}`),
            reserved: sequelize.literal(`reserved - ${item.quantity}`),
          },
          { where: { id: item.book_id }, transaction: t },
        );
      }
    });

    // Notify user about dispatch
    try {
      await notificationService.sendToUser(
        order.user_id,
        "ORDER_SHIPPED",
        "🚚 Order Dispatched!",
        `Great news! Your order ${order.order_no} has been shipped via ${courier_name || "our courier partner"}. Tracking ID: ${tracking_id || "N/A"}.`,
        {
          order_id: String(order.id),
          order_no: order.order_no,
          tracking_id: tracking_id || "",
          tracking_url: tracking_url || "",
        },
      );
    } catch (notifError) {}

    return await this._getOrderWithDetails(order.id);
  }

  /**
   * ADMIN: Automated Dispatch via Shiprocket
   */
  async dispatchOrderWithShiprocket(orderId) {
    logger.info(`Attempting Shiprocket dispatch for Order ID: ${orderId}`);
    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: "user" },
        { model: OrderItem, as: "items", include: [{ model: Book, as: "book" }] },
        { model: Address, as: "address" },
      ],
    });

    if (order) {
      logger.info(`Order found. Address ID: ${order.address_id}, Address Object Loaded: ${!!order.address}`);
    }

    if (!order) throw new Error("The specified order was not found.");
    if (order.order_type !== "physical_book") {
      throw new Error("Only physical book orders can be shipped via Shiprocket.");
    }
    if (order.delivery_status !== "processing") {
      throw new Error(`Cannot ship an order with status: ${order.delivery_status}`);
    }

    // 1. Create order in Shiprocket
    const shiprocketResult = await shiprocketService.createCustomOrder(
      order,
      order.user,
      order.address,
      order.items,
    );

    // 2. Update DB with Shiprocket details
    await sequelize.transaction(async (t) => {
      await order.update(
        {
          delivery_status: "shipped",
          shiprocket_order_id: shiprocketResult.order_id ? String(shiprocketResult.order_id) : null,
          shiprocket_shipment_id: shiprocketResult.shipment_id ? String(shiprocketResult.shipment_id) : null,
          tracking_id: shiprocketResult.awb_code || (shiprocketResult.shipment_id ? String(shiprocketResult.shipment_id) : null),
          tracking_url: shiprocketResult.awb_code ? `https://shiprocket.co/tracking/${shiprocketResult.awb_code}` : null,
          courier_name: "Shiprocket",
        },
        { transaction: t },
      );

      // Finalize inventory
      for (const item of order.items) {
        await Book.update(
          {
            stock: sequelize.literal(`stock - ${item.quantity}`),
            reserved: sequelize.literal(`reserved - ${item.quantity}`),
          },
          { where: { id: item.book_id }, transaction: t },
        );
      }
    });

    // 3. Notify user
    try {
      await notificationService.sendToUser(
        order.user_id,
        "ORDER_SHIPPED",
        "🚚 Order Dispatched!",
        `Great news! Your order ${order.order_no} has been shipped via Shiprocket. We'll update you with the tracking details soon.`,
        {
          order_id: String(order.id),
          order_no: order.order_no,
          shiprocket_order_id: String(shiprocketResult.order_id),
        },
      );
    } catch (e) {}

    return await this._getOrderWithDetails(order.id);
  }

  async updateOrderStatus(orderId, statusData) {
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: "items" }],
    });
    if (!order) throw new Error("The specified order was not found.");

    const oldStatus = order.delivery_status;
    const newStatus = statusData.delivery_status;

    const allowed = [
      "delivery_status",
      "payment_status",
      "payment_method",
      "tracking_id",
      "courier_name",
      "tracking_url",
    ];
    const updates = {};
    for (const key of allowed) {
      if (statusData[key] !== undefined) updates[key] = statusData[key];
    }

    // Automatic Payment Status for COD: Mark as PAID when DELIVERED
    if (
      newStatus === "delivered" &&
      order.payment_method === "cod" &&
      order.payment_status === "pending"
    ) {
      updates.payment_status = "paid";
    }

    if (newStatus === "delivered" && oldStatus !== "delivered") {
      updates.delivered_at = new Date();
    }

    // Handle restocking if status changes to 'returned'
    // Only restock if the previous status was NOT 'returned' or 'cancelled'
    const needsRestock =
      newStatus === "returned" &&
      oldStatus !== "returned" &&
      oldStatus !== "cancelled";

    if (needsRestock) {
      await sequelize.transaction(async (t) => {
        await order.update(updates, { transaction: t });

        // Restock items (Return to STOCK)
        for (const item of order.items) {
          await Book.update(
            { stock: sequelize.literal(`stock + ${item.quantity}`) },
            { where: { id: item.book_id }, transaction: t },
          );
        }
      });
    } else if (newStatus === "cancelled" && oldStatus === "processing") {
      // Manual/Admin cancel from processing: Clear reservation
      await sequelize.transaction(async (t) => {
        await order.update(updates, { transaction: t });
        for (const item of order.items) {
          await Book.update(
            { reserved: sequelize.literal(`reserved - ${item.quantity}`) },
            { where: { id: item.book_id }, transaction: t },
          );
        }
      });
    } else {
      await order.update(updates);
    }

    // Notify user about status update
    if (newStatus && newStatus !== oldStatus) {
      try {
        let title = "📋 Order Status Updated";
        let message = `The status of your order ${order.order_no} has been updated to ${newStatus.toUpperCase()}.`;

        if (newStatus === "returned") {
          title = "🔄 Order Returned";
          message = `Your order ${order.order_no} has been successfully returned and processed.`;
        }

        await notificationService.sendToUser(
          order.user_id,
          newStatus === "returned" ? "ORDER_RETURNED" : "ORDER_STATUS_UPDATE",
          title,
          message,
          {
            order_id: String(order.id),
            order_no: order.order_no,
            status: newStatus,
          },
        );
      } catch (notifError) { }
    }

    return await this._getOrderWithDetails(order.id);
  }

  /**
   * ADMIN: Delete an order permanently
   */
  async deleteOrder(orderId) {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("The specified order was not found.");
    await order.destroy();
    return true;
  }

  /**
   * USER: Request a refund (within 7 days of order)
   */
  async requestRefund(userId, orderId, reason) {
    const order = await Order.findOne({
      where: { id: orderId, user_id: userId },
    });
    if (!order) throw new Error("The specified order was not found.");

    if (order.refund_requested) {
      throw new Error("A refund has already been requested for this order.");
    }

    if (!order.delivered_at && order.payment_method === "cod") {
      throw new Error(
        "COD orders can only be refunded after delivery. For pending orders, please use the 'Cancel Order' option.",
      );
    }

    if (!order.delivered_at && order.payment_status !== "paid") {
      throw new Error(
        "A refund can only be requested for prepaid orders or after delivery.",
      );
    }

    if (order.delivered_at) {
      const deliveryDate = new Date(order.delivered_at);
      const now = new Date();
      const diffTime = Math.abs(now - deliveryDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 7) {
        throw new Error(
          "The refund request window (7 days from delivery) has expired.",
        );
      }
    }

    await order.update({ refund_requested: true, refund_reason: reason });

    // Create a system notification for the admin
    try {
      await notificationService.saveNotification(
        null, // System-level notification
        "REFUND_REQUEST",
        "🔄 New Refund Request",
        `User #${userId} has requested a refund for Order ${order.order_no}. Reason: ${reason || "Not specified."}`,
        { order_id: order.id, order_no: order.order_no, user_id: userId },
      );
    } catch (notifErr) {
      console.error("Failed to create refund notification log:", notifErr);
    }

    return order;
  }

  /**
   * USER: Cancel an order (only if it is still 'processing')
   */
  async cancelOrder(userId, orderId, reason) {
    const order = await Order.findOne({
      where: { id: orderId, user_id: userId },
      include: [{ model: OrderItem, as: "items" }],
    });

    if (!order) throw new Error("The specified order was not found.");

    if (order.delivery_status !== "processing") {
      throw new Error(
        `Cannot cancel an order that is already ${order.delivery_status}.`,
      );
    }

    // Cancel in a transaction to ensure stock is returned
    await sequelize.transaction(async (t) => {
      await order.update({ delivery_status: "cancelled" }, { transaction: t });

      // Clear reserved stock
      for (const item of order.items) {
        await Book.update(
          { reserved: sequelize.literal(`reserved - ${item.quantity}`) },
          { where: { id: item.book_id }, transaction: t },
        );
      }

      // If it's a prepaid and PAID order, automatically mark it for refund
      if (order.payment_status === "paid" && order.payment_method !== "cod") {
        await order.update(
          {
            refund_requested: true,
            refund_reason: reason || "Order cancelled before delivery",
          },
          { transaction: t }
        );

        // Notify admin about this auto-refund request
        try {
          await notificationService.saveNotification(
            null,
            "REFUND_REQUEST",
            "🔄 Prepaid Order Cancelled - Refund Needed",
            `Order ${order.order_no} was cancelled by user #${userId} and needs a refund. Reason: ${reason || "Cancelled before delivery."}`,
            { order_id: order.id, order_no: order.order_no, user_id: userId },
          );
        } catch (e) { }
      }
    });

    // Notify user
    try {
      await notificationService.sendToUser(
        userId,
        "ORDER_CANCELLED",
        "❌ Order Cancelled",
        `Your order ${order.order_no} has been cancelled successfully. Any payment made will be refunded according to our policy.`,
        { order_id: String(order.id), order_no: order.order_no },
      );
    } catch (notifError) {
      console.error("Order cancel notification failed:", notifError.message);
    }

    return await this._getOrderWithDetails(order.id);
  }

  // ─── Private Helpers ───

  async _syncOrderWithShiprocket(orderId) {
    try {
      const order = await Order.findByPk(orderId);
      if (!order || order.shiprocket_order_id) return; // Skip if already synced or not found

      const orderWithDetails = await this._getOrderWithDetails(order.id);
      logger.info(`[AUTO-DISPATCH] Attempting Shiprocket sync for Order: ${order.id}`);
      
      const shiprocketResult = await shiprocketService.createCustomOrder(
        orderWithDetails,
        orderWithDetails.user,
        orderWithDetails.address,
        orderWithDetails.items,
      );

      if (shiprocketResult && (shiprocketResult.order_id || shiprocketResult.shipment_id)) {
        await order.update({
          delivery_status: "processing", // Changed from shipped to keep sequence
          shiprocket_order_id: shiprocketResult.order_id ? String(shiprocketResult.order_id) : null,
          shiprocket_shipment_id: shiprocketResult.shipment_id ? String(shiprocketResult.shipment_id) : null,
          tracking_id: shiprocketResult.awb_code || (shiprocketResult.shipment_id ? String(shiprocketResult.shipment_id) : null),
          tracking_url: (shiprocketResult.awb_code || shiprocketResult.shipment_id) ? `https://shiprocket.co/tracking/${shiprocketResult.awb_code || shiprocketResult.shipment_id}` : null,
          courier_name: "Shiprocket",
        });
        logger.info(`[AUTO-DISPATCH] SUCCESS: Order ${order.id} pushed to Shiprocket.`);
      }
    } catch (srErr) {
      logger.error(`[AUTO-DISPATCH] Shiprocket sync failed for Order ${orderId}:`, srErr.message);
    }
  }

  /**
   * ADMIN: Fetch latest status from Shiprocket and update DB
   */
  async refreshShiprocketStatus(orderId) {
    const order = await Order.findByPk(orderId);
    if (!order || !order.shiprocket_shipment_id) {
      throw new Error("Order not synced with Shiprocket or not found.");
    }

    const trackingData = await shiprocketService.trackOrder(order.shiprocket_shipment_id);
    if (!trackingData || !trackingData.tracking_data) return order;

    // Use awb if available for better tracking
    if (trackingData.tracking_data.track_status === 1 && trackingData.tracking_data.shipment_track && trackingData.tracking_data.shipment_track[0]) {
      const track = trackingData.tracking_data.shipment_track[0];
      const srStatus = track.current_status?.toLowerCase();
      
      let newStatus = order.delivery_status;
      if (["shipped", "picked up", "in transit", "out for delivery"].includes(srStatus)) {
        newStatus = "shipped";
      } else if (srStatus === "delivered") {
        newStatus = "delivered";
      } else if (["cancelled", "rto", "returned"].includes(srStatus)) {
        newStatus = srStatus === "cancelled" ? "cancelled" : "returned";
      }

      if (newStatus !== order.delivery_status) {
        await this.updateOrderStatus(orderId, { 
          delivery_status: newStatus,
          tracking_id: track.awb_code || order.tracking_id
        });
        logger.info(`[AUTO-UPDATE] Order ${orderId} updated to ${newStatus} via Shiprocket refresh.`);
      }
    }

    return await this._getOrderWithDetails(orderId);
  }

  /**
   * EXTERNAL: Handle Shiprocket Webhook
   */
  async handleShiprocketWebhook(payload) {
    const { order_id, shipment_id, status, awb } = payload;
    
    // Find order by Shiprocket shipment_id or order_id
    const order = await Order.findOne({
      where: {
        [sequelize.Op.or]: [
          { shiprocket_shipment_id: String(shipment_id) },
          { shiprocket_order_id: String(order_id) }
        ]
      }
    });

    if (!order) {
      logger.warn(`[SHIPROCKET-WEBHOOK] Order not found for ShipmentID: ${shipment_id}`);
      return false;
    }

    const srStatus = status?.toLowerCase();
    let newStatus = order.delivery_status;

    if (["shipped", "picked up", "in transit", "out for delivery"].includes(srStatus)) {
      newStatus = "shipped";
    } else if (srStatus === "delivered") {
      newStatus = "delivered";
    } else if (["cancelled", "rto", "returned"].includes(srStatus)) {
      newStatus = srStatus === "cancelled" ? "cancelled" : "returned";
    }

    if (newStatus !== order.delivery_status) {
      await this.updateOrderStatus(order.id, { 
        delivery_status: newStatus,
        tracking_id: awb || order.tracking_id
      });
      logger.info(`[SHIPROCKET-WEBHOOK] Order ${order.id} updated to ${newStatus}`);
    }

    return true;
  }

  async _getOrderWithDetails(orderId, extraWhere = {}) {
    return await Order.findOne({
      where: { id: orderId, ...extraWhere },
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
        {
          model: Coupon,
          as: "coupon",
          attributes: ["id", "code", "discount_type", "discount_value"],
        },
        {
          model: Address,
          as: "address",
        },
      ],
    });
  }
}

export default new OrderService();
