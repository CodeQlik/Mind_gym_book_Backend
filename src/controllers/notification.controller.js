import notificationService from "../services/notification.service.js";
import sendResponse from "../utils/responseHandler.js";

// ─────────────────────────────────────────────────────────────────────────────
// FCM Token Registration
// POST /api/v1/notifications/fcm-token
// ─────────────────────────────────────────────────────────────────────────────
export const registerFCMToken = async (req, res, next) => {
  try {
    const { fcm_token } = req.body;
    await notificationService.registerFCMToken(req.user.id, fcm_token);
    return sendResponse(res, 200, true, "FCM token registered successfully");
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get User Notifications (paginated)
// GET /api/v1/notifications?page=1&limit=20
// ─────────────────────────────────────────────────────────────────────────────
export const getUserNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await notificationService.getUserNotifications(
      req.user.id,
      page,
      limit,
    );
    return sendResponse(
      res,
      200,
      true,
      "Notifications fetched successfully",
      result,
    );
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Unread Count
// GET /api/v1/notifications/unread-count
// ─────────────────────────────────────────────────────────────────────────────
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return sendResponse(res, 200, true, "Unread count fetched", { count });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Mark Single Notification as Read
// PATCH /api/v1/notifications/:id/read
// ─────────────────────────────────────────────────────────────────────────────
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user.id,
    );

    if (!notification) {
      return sendResponse(res, 404, false, "Notification not found");
    }

    return sendResponse(
      res,
      200,
      true,
      "Notification marked as read",
      notification,
    );
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Mark All Notifications as Read
// PATCH /api/v1/notifications/mark-all-read
// ─────────────────────────────────────────────────────────────────────────────
export const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    return sendResponse(res, 200, true, "All notifications marked as read");
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete a Notification
// DELETE /api/v1/notifications/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteNotification = async (req, res, next) => {
  try {
    const success = await notificationService.deleteNotification(
      req.params.id,
      req.user.id,
    );

    if (!success) {
      return sendResponse(res, 404, false, "Notification not found");
    }

    return sendResponse(res, 200, true, "Notification deleted successfully");
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Favorite Categories
// GET /api/v1/notifications/favorite-categories
// ─────────────────────────────────────────────────────────────────────────────
export const getFavoriteCategories = async (req, res, next) => {
  try {
    const categories = await notificationService.getFavoriteCategories(
      req.user.id,
    );
    return sendResponse(
      res,
      200,
      true,
      "Favorite categories fetched",
      categories,
    );
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Add Favorite Category
// POST /api/v1/notifications/favorite-categories
// ─────────────────────────────────────────────────────────────────────────────
export const addFavoriteCategory = async (req, res, next) => {
  try {
    const { category_id } = req.body;
    await notificationService.addFavoriteCategory(req.user.id, category_id);
    return sendResponse(res, 201, true, "Category added to favorites");
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Remove Favorite Category
// DELETE /api/v1/notifications/favorite-categories/:categoryId
// ─────────────────────────────────────────────────────────────────────────────
export const removeFavoriteCategory = async (req, res, next) => {
  try {
    await notificationService.removeFavoriteCategory(
      req.user.id,
      req.params.categoryId,
    );
    return sendResponse(res, 200, true, "Category removed from favorites");
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Sync Favorite Categories (replace all at once)
// PUT /api/v1/notifications/favorite-categories/sync
// ─────────────────────────────────────────────────────────────────────────────
export const syncFavoriteCategories = async (req, res, next) => {
  try {
    const { category_ids } = req.body;
    const categories = await notificationService.syncFavoriteCategories(
      req.user.id,
      category_ids,
    );
    return sendResponse(
      res,
      200,
      true,
      "Favorite categories synced successfully",
      categories,
    );
  } catch (error) {
    next(error);
  }
};

// [ADMIN] Send Notification (Supports Targeting)
export const sendNotificationToUser = async (req, res, next) => {
  try {
    const { target, user_id, category_id, type, title, message, metadata } =
      req.body;

    let result;

    if (target === "ALL") {
      result = await notificationService.sendToAll(
        type,
        title,
        message,
        metadata || null,
      );
    } else if (target === "CATEGORY") {
      if (!category_id)
        throw new Error("category_id is required for category targeting");
      result = await notificationService.sendToCategory(
        category_id,
        type,
        title,
        message,
        metadata || null,
      );
    } else {
      // Default: Single User targeting
      if (!user_id) throw new Error("user_id or target is required");
      result = await notificationService.sendToUser(
        user_id,
        type,
        title,
        message,
        metadata || null,
      );
    }

    return sendResponse(
      res,
      201,
      true,
      "Notification process completed",
      result,
    );
  } catch (error) {
    next(error);
  }
};
