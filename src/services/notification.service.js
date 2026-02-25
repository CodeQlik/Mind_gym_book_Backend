import { getMessaging } from "../config/firebase.js";
import Notification from "../models/notification.model.js";
import { User, Category } from "../models/index.js";
import UserFavoriteCategory from "../models/userFavoriteCategory.model.js";

class NotificationService {
  // ─── Template Helper: Replace placeholders with real values ─────────────────
  // Usage: formatMessage("Hello {user_name}, {book_title} is available!", user, metadata)
  formatMessage(template, userData = {}, metadata = {}) {
    return template
      .replace("{user_name}", userData.name || "User")
      .replace("{book_title}", metadata.book_title || "New Book")
      .replace("{category}", metadata.category || "")
      .replace("{discount}", metadata.discount || "0%")
      .replace("{days_left}", metadata.days_left || "0");
  }

  // FCM: Send to a single device token
  async sendFCM(fcmToken, title, body, data = {}) {
    try {
      const messaging = getMessaging();
      const message = {
        token: fcmToken,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
        android: {
          notification: {
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        apns: {
          payload: {
            aps: { sound: "default" },
          },
        },
      };
      const response = await messaging.send(message);

      return response;
    } catch (error) {
      return null; // Don't throw — invalid/expired token shouldn't crash the app
    }
  }
  // FCM: Send to multiple tokens (multicast)
  async sendFCMMulticast(fcmTokens, title, body, data = {}) {
    if (!fcmTokens || fcmTokens.length === 0) return;

    try {
      const messaging = getMessaging();
      const message = {
        tokens: fcmTokens,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
        android: {
          notification: {
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        apns: {
          payload: {
            aps: { sound: "default" },
          },
        },
      };
      const response = await messaging.sendEachForMulticast(message);

      return response;
    } catch (error) {
      return null;
    }
  }

  // DB: Save a notification record
  async saveNotification(userId, type, title, message, metadata = null) {
    return await Notification.create({
      user_id: userId,
      type,
      title,
      message,
      metadata,
      is_read: false,
    });
  }

  // Notify users when a new book releases in their favorite category
  async notifyNewBookRelease(book, categoryName) {
    try {
      const favorites = await UserFavoriteCategory.findAll({
        where: { category_id: book.category_id },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "fcm_token"],
            where: { is_active: true },
          },
        ],
      });

      if (!favorites || favorites.length === 0) {
        return;
      }

      const title = "📚 New Book Release!";
      const body = `"${book.title}" by ${book.author} is now available in ${categoryName}`;
      const metadata = {
        book_id: String(book.id),
        category_id: String(book.category_id),
        book_title: book.title,
      };

      const fcmTokens = [];
      const dbNotifPromises = [];

      for (const fav of favorites) {
        const user = fav.user;
        if (!user) continue;

        // Save to DB for each user
        dbNotifPromises.push(
          this.saveNotification(user.id, "NEW_RELEASE", title, body, metadata),
        );

        // Collect valid FCM tokens
        if (user.fcm_token) {
          fcmTokens.push(user.fcm_token);
        }
      }

      // Save all DB notifications in parallel
      await Promise.allSettled(dbNotifPromises);

      // Send FCM multicast to all devices at once
      if (fcmTokens.length > 0) {
        await this.sendFCMMulticast(fcmTokens, title, body, metadata);
      }
    } catch (error) {}
  }
  // Admin: Send notification to a specific user
  async sendToUser(userId, type, title, message, metadata = null) {
    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "fcm_token"],
    });
    if (!user) throw new Error("User not found");

    // Replace placeholders like {user_name}
    const formattedMessage = this.formatMessage(message, user, metadata || {});

    // Save to DB
    const notification = await this.saveNotification(
      userId,
      type,
      title,
      formattedMessage,
      metadata,
    );

    // Send FCM push if token exists
    if (user.fcm_token) {
      await this.sendFCM(
        user.fcm_token,
        title,
        formattedMessage,
        metadata || {},
      );
    }

    return notification;
  }

  // Admin: Send notification to ALL active users
  async sendToAll(type, title, message, metadata = null) {
    const users = await User.findAll({
      where: { is_active: true },
      attributes: ["id", "name", "fcm_token"],
    });

    const fcmTokens = [];
    const dbPromises = [];

    for (const user of users) {
      const formattedMessage = this.formatMessage(
        message,
        user,
        metadata || {},
      );

      dbPromises.push(
        this.saveNotification(user.id, type, title, formattedMessage, metadata),
      );

      if (user.fcm_token) {
        fcmTokens.push(user.fcm_token);
      }
    }

    await Promise.allSettled(dbPromises);

    if (fcmTokens.length > 0) {
      await this.sendFCMMulticast(fcmTokens, title, message, metadata || {});
    }

    return { dbCount: users.length, fcmCount: fcmTokens.length };
  }

  // Admin: Send notification by Category Interest
  async sendToCategory(categoryId, type, title, message, metadata = null) {
    const favorites = await UserFavoriteCategory.findAll({
      where: { category_id: categoryId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "fcm_token"],
          where: { is_active: true },
        },
      ],
    });

    const fcmTokens = [];
    const dbPromises = [];

    for (const fav of favorites) {
      const user = fav.user;
      if (!user) continue;

      const formattedMessage = this.formatMessage(
        message,
        user,
        metadata || {},
      );
      dbPromises.push(
        this.saveNotification(user.id, type, title, formattedMessage, metadata),
      );

      if (user.fcm_token) {
        fcmTokens.push(user.fcm_token);
      }
    }

    await Promise.allSettled(dbPromises);

    if (fcmTokens.length > 0) {
      await this.sendFCMMulticast(fcmTokens, title, message, metadata || {});
    }

    return { dbCount: favorites.length, fcmCount: fcmTokens.length };
  }

  // Get user notifications (paginated)
  async getUserNotifications(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      total_items: count,
      total_pages: Math.ceil(count / limit),
      current_page: page,
      notifications: rows,
    };
  }

  // Get unread count for a user
  async getUnreadCount(userId) {
    return await Notification.count({
      where: { user_id: userId, is_read: false },
    });
  }

  // Mark a single notification as read
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, user_id: userId },
    });
    if (!notification) return null;

    notification.is_read = true;
    await notification.save();
    return notification;
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    await Notification.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } },
    );
    return true;
  }

  // Delete a single notification
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, user_id: userId },
    });
    if (!notification) return false;

    await notification.destroy();
    return true;
  }

  // Register / Update FCM Token
  async registerFCMToken(userId, fcmToken) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");

    user.fcm_token = fcmToken;
    await user.save();
    return true;
  }

  // Favorite Categories
  async getFavoriteCategories(userId) {
    const favorites = await UserFavoriteCategory.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "slug", "image"],
        },
      ],
    });
    return favorites.map((f) => f.category);
  }

  async addFavoriteCategory(userId, categoryId) {
    const category = await Category.findByPk(categoryId);
    if (!category) throw new Error("Category not found");

    const [fav, created] = await UserFavoriteCategory.findOrCreate({
      where: { user_id: userId, category_id: categoryId },
    });

    if (!created) throw new Error("Category already in favorites");
    return fav;
  }

  async removeFavoriteCategory(userId, categoryId) {
    const fav = await UserFavoriteCategory.findOne({
      where: { user_id: userId, category_id: categoryId },
    });
    if (!fav) throw new Error("Category not in favorites");

    await fav.destroy();
    return true;
  }

  async syncFavoriteCategories(userId, categoryIds) {
    // Replace all favorites with the new list
    await UserFavoriteCategory.destroy({ where: { user_id: userId } });

    if (categoryIds && categoryIds.length > 0) {
      const records = categoryIds.map((category_id) => ({
        user_id: userId,
        category_id,
      }));
      await UserFavoriteCategory.bulkCreate(records, {
        ignoreDuplicates: true,
      });
    }

    return await this.getFavoriteCategories(userId);
  }
}

export default new NotificationService();
