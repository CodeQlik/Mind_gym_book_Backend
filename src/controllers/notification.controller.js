import notificationService from "../services/notification.service.js";
import sendResponse from "../utils/responseHandler.js";

export const registerFCMToken = async (req, res, next) => {
  try {
    const { fcm_token } = req.body;
    await notificationService.registerFCMToken(req.user.id, fcm_token);
    return sendResponse(res, 200, true, "FCM token registered successfully");
  } catch (error) {
    next(error);
  }
};

export const getUserNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await notificationService.getUserNotifications(
      req.user.id,
      req.user.user_type,
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

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(
      req.user.id,
      req.user.user_type,
    );
    return sendResponse(res, 200, true, "Unread count fetched", { count });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user.id,
      req.user.user_type,
    );

    if (!notification) {
      return sendResponse(res, 404, false, "Notification not found.");
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

export const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id, req.user.user_type);
    return sendResponse(res, 200, true, "All notifications marked as read");
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const success = await notificationService.deleteNotification(
      req.params.id,
      req.user.id,
    );

    if (!success) {
      return sendResponse(res, 404, false, "Notification not found.");
    }

    return sendResponse(res, 200, true, "Notification deleted successfully");
  } catch (error) {
    next(error);
  }
};

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

export const addFavoriteCategory = async (req, res, next) => {
  try {
    const { category_id } = req.body;
    await notificationService.addFavoriteCategory(req.user.id, category_id);
    return sendResponse(res, 201, true, "Category added to favorites");
  } catch (error) {
    next(error);
  }
};

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
    const {
      target,
      user_id,
      category_id,
      type,
      title,
      message,
      metadata,
      status,
      scheduled_at,
      send_push,
      send_email,
    } = req.body;

    let result;
    const senderId = req.user.id;

    if (target === "ALL") {
      result = await notificationService.sendToAll(
        type,
        title,
        message,
        metadata || null,
        status,
        scheduled_at,
        senderId,
        send_push,
        send_email,
      );
    } else if (target === "CATEGORY") {
      if (!category_id)
        throw new Error("A category ID is required for category targeting.");
      result = await notificationService.sendToCategory(
        category_id,
        type,
        title,
        message,
        metadata || null,
        status,
        scheduled_at,
        senderId,
        send_push,
        send_email,
      );
    } else if (target === "SUBSCRIBED") {
      result = await notificationService.sendToSubscribed(
        type,
        title,
        message,
        metadata || null,
        status,
        scheduled_at,
        senderId,
        send_push,
        send_email,
      );
    } else if (target === "WISHLIST") {
      result = await notificationService.sendToWishlist(
        type,
        title,
        message,
        metadata || null,
        status,
        scheduled_at,
        senderId,
        send_push,
        send_email,
      );
    } else if (target === "EXPIRING") {
      result = await notificationService.sendToExpiring(
        type,
        title,
        message,
        metadata || null,
        status,
        scheduled_at,
        senderId,
        send_push,
        send_email,
      );
    } else {
      // Default: Single User targeting (USER)
      if (!user_id && target !== "ALL" && target !== "CATEGORY")
        throw new Error("A user ID or target is required.");
      result = await notificationService.sendToUser(
        user_id,
        type,
        title,
        message,
        metadata || null,
        status,
        scheduled_at,
        senderId,
        send_push,
        send_email,
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
// [ADMIN] Get All System Notifications (History)
export const getAllNotificationsAdmin = async (req, res, next) => {
  try {
    const { page, limit, user_id, type, status, target } = req.query;
    const result = await notificationService.getAllNotificationsAdmin({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      userId: user_id,
      type,
      status,
      target,
    });
    return sendResponse(
      res,
      200,
      true,
      "System notifications fetched successfully",
      result,
    );
  } catch (error) {
    next(error);
  }
};

// [ADMIN] Get Notification stats
export const getNotificationStats = async (req, res, next) => {
  try {
    const stats = await notificationService.getNotificationStatsAdmin();
    return sendResponse(res, 200, true, "Notification stats fetched", stats);
  } catch (error) {
    next(error);
  }
};

// [ADMIN] Mark all notifications as read in the entire system
export const markAllAsReadAdmin = async (req, res, next) => {
  try {
    await notificationService.markAllAsReadAdmin();
    return sendResponse(
      res,
      200,
      true,
      "All system notifications marked as read",
    );
  } catch (error) {
    next(error);
  }
};

// [ADMIN] Delete any notification
export const deleteNotificationAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await notificationService.deleteNotificationAdmin(id);
    if (!success) {
      return sendResponse(res, 404, false, "Notification not found.");
    }
    return sendResponse(res, 200, true, "Notification deleted by admin");
  } catch (error) {
    next(error);
  }
};
