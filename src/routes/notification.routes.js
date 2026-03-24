import express from "express";
import {
  registerFCMToken,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getFavoriteCategories,
  addFavoriteCategory,
  removeFavoriteCategory,
  syncFavoriteCategories,
  sendNotificationToUser,
  getAllNotificationsAdmin,
  getNotificationStats,
  deleteNotificationAdmin,
  markAllAsReadAdmin,
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import {
  registerFCMTokenValidation,
  sendNotificationValidation,
  addFavoriteCategoryValidation,
  syncFavoriteCategoriesValidation,
} from "../validations/notification.validation.js";

const router = express.Router();

// FCM Token
router.post(
  "/fcm-token",
  verifyJWT,
  validate(registerFCMTokenValidation),
  registerFCMToken,
);
// User Notifications
router.get("/", verifyJWT, getUserNotifications);
router.get("/unread-count", verifyJWT, getUnreadCount);
router.patch("/mark-all-read", verifyJWT, markAllAsRead);
router.patch("/:id/read", verifyJWT, markAsRead);
router.delete("/delete-all", verifyJWT, deleteAllNotifications);
router.delete("/:id", verifyJWT, deleteNotification);
// Favorite Categories
router.get("/favorite-categories", verifyJWT, getFavoriteCategories);
router.post(
  "/favorite-categories",
  verifyJWT,
  validate(addFavoriteCategoryValidation),
  addFavoriteCategory,
);
router.delete(
  "/favorite-categories/:categoryId",
  verifyJWT,
  removeFavoriteCategory,
);
router.put(
  "/favorite-categories/sync",
  verifyJWT,
  validate(syncFavoriteCategoriesValidation),
  syncFavoriteCategories,
);
// Admin Routes
router.post(
  "/admin/send",
  verifyJWT,
  isAdmin,
  validate(sendNotificationValidation),
  sendNotificationToUser,
);

router.get("/admin/all", verifyJWT, isAdmin, getAllNotificationsAdmin);
router.get("/admin/stats", verifyJWT, isAdmin, getNotificationStats);
router.patch("/admin/mark-all-read", verifyJWT, isAdmin, markAllAsReadAdmin);
router.delete("/admin/delete/:id", verifyJWT, isAdmin, deleteNotificationAdmin);

export default router;
