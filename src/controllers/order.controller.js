import orderService from "../services/order.service.js";
import sendResponse from "../utils/responseHandler.js";

export const createPhysicalOrder = async (req, res, next) => {
  try {
    const order = await orderService.createPhysicalOrder(req.user.id, req.body);
    return sendResponse(res, 201, true, "Physical book order placed", order);
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getMyOrders(req.user.id);
    return sendResponse(res, 200, true, "My orders fetched", orders);
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

// Admin Controllers
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getAllOrders(req.query.status);
    return sendResponse(res, 200, true, "All orders fetched", orders);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body);
    return sendResponse(res, 200, true, "Order status updated", order);
  } catch (error) {
    next(error);
  }
};
