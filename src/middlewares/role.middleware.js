import sendResponse from "../utils/responseHandler.js";

/**
 * Middleware to authorize specific roles
 * @param {...string} roles - Allowed roles ('admin', 'user')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(
        res,
        401,
        false,
        "Unauthorized. Authentication required.",
      );
    }

    if (!roles.includes(req.user.user_type)) {
      return sendResponse(
        res,
        403,
        false,
        "Access denied. You do not have permission to access this resource.",
      );
    }

    next();
  };
};

// Convenience shortcuts
export const isAdmin = authorize("admin");
export const isUser = authorize("user");
export const isAnyUser = authorize("admin", "user");
