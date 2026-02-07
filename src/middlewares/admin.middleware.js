import sendResponse from '../utils/responseHandler.js';

export const isAdmin = (req, res, next) => {
    if (req.user && req.user.user_type === 'admin') {
        next();
    } else {
        return sendResponse(res, 403, false, "Access denied. Admin resource only.");
    }
};
