import paymentService from "../services/payment.service.js";
import sendResponse from "../utils/responseHandler.js";

//  APP: Subscription Payment
export const createSubscriptionOrder = async (req, res, next) => {
  try {
    const { plan_type } = req.body;
    if (!plan_type) {
      return sendResponse(res, 400, false, "plan_type is required");
    }
    const result = await paymentService.createSubscriptionOrder(
      req.user.id,
      plan_type,
    );
    return sendResponse(res, 201, true, "Subscription order created", result);
  } catch (error) {
    next(error);
  }
};

//  WEBSITE: Physical Book Payment (Online: UPI / Card / Prepaid)
export const createPhysicalBookPayment = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return sendResponse(res, 400, false, "order_id is required");
    }
    const result = await paymentService.createPhysicalBookPaymentOrder(
      req.user.id,
      order_id,
    );
    return sendResponse(res, 201, true, "Payment order created", result);
  } catch (error) {
    next(error);
  }
};

//  WEBSITE: COD — Record Cash on Delivery order
export const confirmCodPayment = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return sendResponse(res, 400, false, "order_id is required");
    }
    const result = await paymentService.createCodPaymentRecord(
      req.user.id,
      order_id,
    );
    return sendResponse(
      res,
      201,
      true,
      "COD order confirmed. Pay on delivery.",
      result,
    );
  } catch (error) {
    next(error);
  }
};

//  SHARED: Verify Payment
export const verifyPayment = async (req, res, next) => {
  try {
    const result = await paymentService.verifyPayment(req.body);
    return sendResponse(
      res,
      200,
      true,
      result.message || "Payment verified",
      result,
    );
  } catch (error) {
    next(error);
  }
};

//  ADMIN
export const getAllPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await paymentService.getAllPayments(page, limit);
    return sendResponse(res, 200, true, "All payments fetched", result);
  } catch (error) {
    next(error);
  }
};
