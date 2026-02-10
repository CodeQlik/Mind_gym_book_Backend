import sendResponse from "../utils/responseHandler.js";

/**
 * Middleware to check if the user is an Admin.
 * Used for protecting Admin Panel resources.
 */
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.user_type === "admin") {
    next();
  } else {
    return sendResponse(
      res,
      403,
      false,
      "Access denied. Admin role is required to access the Admin Panel.",
    );
  }
};
