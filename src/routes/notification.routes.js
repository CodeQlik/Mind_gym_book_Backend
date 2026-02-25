import express from "express";
import {
  registerFCMToken,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getFavoriteCategories,
  addFavoriteCategory,
  removeFavoriteCategory,
  syncFavoriteCategories,
  sendNotificationToUser,
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

export default router;
