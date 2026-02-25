import paymentService from "../services/payment.service.js";
import sendResponse from "../utils/responseHandler.js";

export const createOrder = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;
    const order = await paymentService.createSubscriptionOrder(userId, plan);
    return sendResponse(res, 201, true, "Order created successfully", order);
  } catch (error) {
    next(error);
  }
};

export const createBookOrder = async (req, res, next) => {
  try {
    const { amount, book_id } = req.body;
    if (!book_id) {
      return sendResponse(res, 400, false, "book_id is required");
    }
    const userId = req.user.id;
    const order = await paymentService.createBookOrder(userId, amount, book_id);
    return sendResponse(
      res,
      201,
      true,
      "Book order created successfully",
      order,
    );
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.verifyPayment(req.body);
    return sendResponse(
      res,
      200,
      true,
      "Payment verified and subscription activated",
      payment,
    );
  } catch (error) {
    next(error);
  }
};

export const getAllPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await paymentService.getAllPayments(page, limit);
    return sendResponse(
      res,
      200,
      true,
      "All payments fetched successfully",
      result,
    );
  } catch (error) {
    next(error);
  }
};
