import orderService from "../services/order.service.js";
import sendResponse from "../utils/responseHandler.js";

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

//  ADMIN
export const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
      delivery_status: req.query.delivery_status || null,
      payment_status: req.query.payment_status || null,
    };
    const result = await orderService.getAllOrders(filters, page, limit);
    return sendResponse(res, 200, true, "All orders fetched", result);
  } catch (error) {
    next(error);
  }
};

export const getOrderByIdAdmin = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.orderId);
    return sendResponse(res, 200, true, "Order details fetched", order);
  } catch (error) {
    next(error);
  }
};

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
