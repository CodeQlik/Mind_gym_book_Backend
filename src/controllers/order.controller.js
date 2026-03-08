import orderService from "../services/order.service.js";
import invoiceService from "../services/invoice.service.js";
import sendResponse from "../utils/responseHandler.js";

// ─── USER: Place order from cart ───────────────────────────────────────────────
export const checkoutFromCart = async (req, res, next) => {
  try {
    const order = await orderService.createOrderFromCart(req.user.id, req.body);
    return sendResponse(
      res,
      201,
      true,
      "Order created. Proceed to payment.",
      order,
    );
  } catch (error) {
    next(error);
  }
};

// ─── USER: Get my orders ───────────────────────────────────────────────────────
export const getMyOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await orderService.getMyOrders(req.user.id, page, limit);
    return sendResponse(res, 200, true, "My orders fetched", result);
  } catch (error) {
    next(error);
  }
};

// ─── USER: Get single order ────────────────────────────────────────────────────
export const getMyOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(
      req.params.orderId,
      req.user.id,
    );
    return sendResponse(res, 200, true, "Order details fetched", order);
  } catch (error) {
    next(error);
  }
};

// ─── USER: Request refund ──────────────────────────────────────────────────────
export const requestRefund = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await orderService.requestRefund(
      req.user.id,
      req.params.orderId,
      reason,
    );
    return sendResponse(res, 200, true, "Refund request submitted", order);
  } catch (error) {
    next(error);
  }
};

// ─── USER: Cancel order ────────────────────────────────────────────────────────
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await orderService.cancelOrder(
      req.user.id,
      req.params.orderId,
    );
    return sendResponse(res, 200, true, "Order cancelled successfully", order);
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Get all orders (with filters + search + pagination) ────────────────
export const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
      delivery_status: req.query.delivery_status || null,
      payment_status: req.query.payment_status || null,
      search: req.query.search || null,
    };
    const result = await orderService.getAllOrders(filters, page, limit);
    return sendResponse(res, 200, true, "All orders fetched", result);
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Get single order detail ───────────────────────────────────────────
export const getOrderByIdAdmin = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.orderId);
    return sendResponse(res, 200, true, "Order details fetched", order);
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Get order stats (tab counts) ──────────────────────────────────────
// Returns: { all, processing, shipped, delivered, cancelled, returned }
export const getOrderStats = async (req, res, next) => {
  try {
    const stats = await orderService.getOrderStats();
    return sendResponse(res, 200, true, "Order stats fetched", stats);
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Search orders ─────────────────────────────────────────────────────
export const searchOrders = async (req, res, next) => {
  try {
    const query = req.query.q || req.query.query || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await orderService.searchOrders(query, page, limit);
    return sendResponse(res, 200, true, "Search results fetched", result);
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Dispatch order ────────────────────────────────────────────────────
export const dispatchOrder = async (req, res, next) => {
  try {
    const order = await orderService.dispatchOrder(
      req.params.orderId,
      req.body,
    );
    return sendResponse(res, 200, true, "Order dispatched successfully", order);
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Update order status ───────────────────────────────────────────────
export const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(
      req.params.orderId,
      req.body,
    );
    return sendResponse(res, 200, true, "Order status updated", order);
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Delete order ──────────────────────────────────────────────────────
export const deleteOrder = async (req, res, next) => {
  try {
    await orderService.deleteOrder(req.params.orderId);
    return sendResponse(res, 200, true, "Order deleted successfully");
  } catch (error) {
    next(error);
  }
};
// ─── SHARED: Download Invoice ──────────────────────────────────────────────────
export const downloadInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await orderService.getOrderById(orderId);

    // Security: Only owner or admin can download
    if (
      req.user.user_type !== "admin" &&
      String(order.user_id) !== String(req.user.id)
    ) {
      return sendResponse(res, 403, false, "Unauthorized to view this invoice");
    }

    const pdfBuffer = await invoiceService.generateOrderInvoice(orderId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoice_${order.order_no}.pdf`,
    );
    return res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
