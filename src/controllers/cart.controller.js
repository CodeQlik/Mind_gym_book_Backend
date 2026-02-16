import cartService from "../services/cart.service.js";
import sendResponse from "../utils/responseHandler.js";

export const addToCart = async (req, res, next) => {
  try {
    const item = await cartService.addToCart(req.user.id, req.body);
    return sendResponse(
      res,
      201,
      true,
      "Item added to cart successfully",
      item,
    );
  } catch (error) {
    next(error);
  }
};

export const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.id);
    return sendResponse(res, 200, true, "Cart fetched successfully", cart);
  } catch (error) {
    next(error);
  }
};

export const updateQuantity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const result = await cartService.updateQuantity(req.user.id, id, quantity);
    return sendResponse(res, 200, true, "Cart updated successfully", result);
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;
    await cartService.removeFromCart(req.user.id, id);
    return sendResponse(res, 200, true, "Item removed from cart");
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    await cartService.clearCart(req.user.id);
    return sendResponse(res, 200, true, "Cart cleared successfully");
  } catch (error) {
    next(error);
  }
};
