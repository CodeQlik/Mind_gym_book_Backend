import orderService from "../services/order.service.js";
import invoiceService from "../services/invoice.service.js";
import sendResponse from "../utils/responseHandler.js";

import paymentService from "../services/payment.service.js";

// ─── USER: Place order from cart ───────────────────────────────────────────────
export const checkoutFromCart = async (req, res, next) => {
  try {
    const result = await orderService.createOrderFromCart(req.user.id, req.body);

    // Prepaid: Initialize Razorpay payment
    if (req.body.payment_method !== "cod") {
      const razorpayData = await paymentService.createBookOrderPayment(
        req.user.id,
        result,
      );
      const isDigital = result.order_type === "digital_book";

      return sendResponse(
        res,
        200,
        true,
        `${isDigital ? "Digital" : "Physical"} book order initialized. Proceed to payment.`,
        {
          payment_type: "prepaid",
          order_type: result.order_type,
          ...razorpayData,
          order_data: result,
        },
      );
    }

    // For COD, it returns the final DB order
    return sendResponse(
      res,
      201,
      true,
      "COD Order placed successfully.",
      result,
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
    const { reason } = req.body;
    const order = await orderService.cancelOrder(
      req.user.id,
      req.params.orderId,
      reason,
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

// ─── ADMIN: Automated Dispatch via Shiprocket ─────────────────────────────────
export const dispatchWithShiprocket = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await orderService.dispatchOrderWithShiprocket(orderId);
    return sendResponse(
      res,
      200,
      true,
      "Order dispatched via Shiprocket successfully.",
      order,
    );
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Refresh status from Shiprocket ────────────────────────────────────
export const refreshShiprocketStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await orderService.refreshShiprocketStatus(orderId);
    return sendResponse(res, 200, true, "Order status refreshed from Shiprocket.", order);
  } catch (error) {
    next(error);
  }
};

// ─── EXTERNAL: Shiprocket Webhook ──────────────────────────────────────────────
export const handleShiprocketWebhook = async (req, res, next) => {
  try {
    // Security Check: Match token with x-api-key header
    const token = req.headers["x-api-key"];
    const secureToken = "mindgym_secure_2026"; // Match this in Shiprocket Panel

    if (token !== secureToken) {
      logger.warn(`[SHIPROCKET-WEBHOOK] Unauthorized access attempt with token: ${token}`);
      return res.status(200).json({ success: false, message: "Unauthorized" });
    }

    // Shiprocket sends data in req.body
    await orderService.handleShiprocketWebhook(req.body);
    // Shiprocket expects a 200/OK response to stop retrying
    return res.status(200).json({ success: true });
  } catch (error) {
    // Log error but don't necessarily send 500 to Shiprocket unless we want them to retry
    console.error("Webhook Error:", error.message);
    return res.status(200).json({ success: false, message: error.message });
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

// ─── ADMIN: Approve and process refund ─────────────────────────────────────────
export const approveRefund = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const result = await paymentService.processRefund(orderId);
    return sendResponse(
      res,
      200,
      true,
      "Refund processed successfully and money has been returned.",
      result,
    );
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
      return sendResponse(res, 403, false, "You are not authorized to view this invoice.");
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
