import { getMessaging } from "../config/firebase.js";
import {
  User,
  Category,
  Subscription,
  Wishlist,
  Notification,
} from "../models/index.js";
import UserFavoriteCategory from "../models/userFavoriteCategory.model.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import { emitNotification } from "../utils/socket.js";
import sendEmail from "../config/sendEmail.js";
import invoiceService from "./invoice.service.js";
import logger from "../utils/logger.js";

class NotificationService {
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
  async saveNotification(
    userId,
    type,
    title,
    message,
    metadata = null,
    status = "SENT",
    scheduledAt = null,
    senderId = null,
  ) {
    const notification = await Notification.create({
      userId: userId,
      type,
      title,
      message,
      metadata,
      status,
      scheduled_at: scheduledAt,
      is_read: false,
    });

    // Real-time emit via Socket.IO if status is SENT
    if (status === "SENT") {
      emitNotification(userId, notification, senderId);
    }

    return notification;
  }

  // Notify users when a new book releases in their favorite category
  async notifyNewBookRelease(book, categoryName) {
    try {
      const favorites = await UserFavoriteCategory.findAll({
        where: { categoryId: book.category_id },
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
  async sendToUser(
    userId,
    type,
    title,
    message,
    metadata = null,
    status = "SENT",
    scheduledAt = null,
    senderId = null,
    send_push = null,
    send_email = null,
  ) {
    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "fcm_token", "user_type"],
    });
    if (!user) throw new Error("User not found");

    // Replace placeholders like {user_name}
    const formattedMessage = this.formatMessage(message, user, metadata || {});

    const meta =
      typeof metadata === "object" && metadata !== null ? { ...metadata } : {};
    if (send_push !== null) meta.send_push = send_push;
    if (send_email !== null) meta.send_email = send_email;

    // Save to DB
    const notification = await this.saveNotification(
      userId,
      type,
      title,
      formattedMessage,
      meta,
      status,
      scheduledAt,
      senderId,
    );

    // Send FCM push ONLY IF status is SENT and user is NOT an admin
    const finalSendPush = send_push !== null ? send_push : true;
    if (
      status === "SENT" &&
      finalSendPush &&
      user.fcm_token &&
      user.user_type !== "admin"
    ) {
      await this.sendFCM(user.fcm_token, title, formattedMessage, meta);
    }

    // Send EMAIL if type matches or explicitly requested
    const emailTypes = [
      "ORDER",
      "RENEWAL",
      "APPROVAL",
      "SUBSCRIPTION",
      "REFUND",
      "PAYMENT",
      "EXPIRED",
      "EXPIRY",
      "EXPIRING",
    ];
    const isEmailRequired = emailTypes.some((t) =>
      type.toUpperCase().includes(t),
    );
    const finalSendEmail = send_email !== null ? send_email : isEmailRequired;

    logger.info(`Checking email condition: status=${status}, finalSendEmail=${finalSendEmail}, userEmail=${user.email}`);
    if (status === "SENT" && finalSendEmail && user.email) {
      logger.info(`Attempting to send email to ${user.email} for type ${type}`);
      try {
        const emailTemplate = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
                .wrapper { width: 100%; table-layout: fixed; padding: 40px 10px; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                .header { background-color: #6366f1; padding: 30px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
                .content { padding: 40px 30px; }
                .content h2 { color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700; }
                .content p { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 25px; }
                .footer { background-color: #f1f5f9; padding: 30px; text-align: center; }
                .footer p { margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5; }
                .footer .brand { font-weight: 700; color: #64748b; margin-bottom: 10px; display: block; }
                .button { display: inline-block; padding: 12px 24px; background-color: #6366f1; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="wrapper">
                <div class="container">
                  <div class="header">
                    <h1>MIND GYM BOOK</h1>
                  </div>
                  <div class="content">
                    <h2>${title}</h2>
                    <p>${formattedMessage}</p>
                    ${
                      metadata?.tracking_url
                        ? `<a href="${metadata.tracking_url}" class="button">Track Your Order</a>`
                        : metadata?.tracking_id
                          ? `<a href="https://shiprocket.co/tracking/${metadata.tracking_id}" class="button">Track Your Order</a>`
                          : metadata?.order_id
                            ? `<a href="${process.env.CLIENT_URL || "http://localhost:5173"}/orders/view/${metadata.order_id}" class="button">View Order Details</a>`
                            : ""
                    }
                  </div>
                  <div class="footer">
                    <span class="brand">Mind Gym Book Publication</span>
                    <p>You received this email because of your recent activity on our platform.</p>
                    <p>&copy; ${new Date().getFullYear()} Mind Gym Book. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `;
        let attachments = [];
        if (type.includes("ORDER") && metadata?.order_id) {
          try {
            const pdfBuffer = await invoiceService.generateOrderInvoice(
              metadata.order_id,
            );
            attachments.push({
              filename: `Invoice_${metadata.order_no || metadata.order_id}.pdf`,
              content: pdfBuffer,
            });
          } catch (pdfErr) {
            console.error("Invoice PDF generation failed:", pdfErr.message);
          }
        }

        await sendEmail(user.email, title, emailTemplate, null, attachments);
      } catch (emailErr) {
        console.error(
          "[NOTIFICATION SERVICE] Email send error:",
          emailErr.message,
        );
      }
    }

    return notification;
  }

  // Admin: Send notification to ALL active users
  async sendToAll(
    type,
    title,
    message,
    metadata = null,
    status = "SENT",
    scheduledAt = null,
    senderId = null,
    send_push = null,
    send_email = null,
  ) {
    // Save only ONE notification for the entire system (Broadcast)
    const meta =
      typeof metadata === "object" && metadata !== null ? { ...metadata } : {};
    meta.target = "ALL";
    if (send_push !== null) meta.send_push = send_push;
    if (send_email !== null) meta.send_email = send_email;

    await this.saveNotification(
      null, // Master record
      type,
      title,
      message,
      meta,
      status,
      scheduledAt,
      senderId,
    );

    const users = await User.findAll({
      where: { is_active: true, user_type: { [Op.ne]: "admin" } },
      attributes: ["id", "fcm_token"],
    });

    const fcmTokens = users
      .map((u) => u.fcm_token)
      .filter((token) => token && status === "SENT");

    if (fcmTokens.length > 0) {
      await this.sendFCMMulticast(fcmTokens, title, message, meta);
    }

    return { dbCount: 1, fcmCount: fcmTokens.length };
  }

  // Admin: Send notification by Category Interest
  async sendToCategory(
    categoryId,
    type,
    title,
    message,
    metadata = null,
    status = "SENT",
    scheduledAt = null,
    senderId = null,
    send_push = null,
    send_email = null,
  ) {
    // Save only ONE notification for this category broadcast
    const meta =
      typeof metadata === "object" && metadata !== null ? { ...metadata } : {};
    meta.target = "CATEGORY";
    meta.category_id = categoryId;
    if (send_push !== null) meta.send_push = send_push;
    if (send_email !== null) meta.send_email = send_email;

    await this.saveNotification(
      null,
      type,
      title,
      message,
      meta,
      status,
      scheduledAt,
      senderId,
    );

    const favorites = await UserFavoriteCategory.findAll({
      where: { categoryId: categoryId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fcm_token"],
          where: { is_active: true },
        },
      ],
    });

    const fcmTokens = favorites
      .map((f) => f.user?.fcm_token)
      .filter((token) => token && status === "SENT");

    if (fcmTokens.length > 0) {
      await this.sendFCMMulticast(fcmTokens, title, message, meta);
    }

    return { dbCount: 1, fcmCount: fcmTokens.length };
  }

  // Admin: Send notification to all ACTIVE SUBSCRIBERS
  async sendToSubscribed(
    type,
    title,
    message,
    metadata = null,
    status = "SENT",
    scheduledAt = null,
    senderId = null,
    send_push = null,
    send_email = null,
  ) {
    // Save ONE master notification
    const meta =
      typeof metadata === "object" && metadata !== null ? { ...metadata } : {};
    meta.target = "SUBSCRIBED";
    if (send_push !== null) meta.send_push = send_push;
    if (send_email !== null) meta.send_email = send_email;

    await this.saveNotification(
      null,
      type,
      title,
      message,
      meta,
      status,
      scheduledAt,
      senderId,
    );

    const activeSubs = await Subscription.findAll({
      where: { status: "active" },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fcm_token"],
          where: { is_active: true },
        },
      ],
    });

    const fcmTokens = activeSubs
      .map((s) => s.user?.fcm_token)
      .filter((t) => t && status === "SENT");

    if (fcmTokens.length > 0) {
      await this.sendFCMMulticast(fcmTokens, title, message, meta);
    }

    return { dbCount: 1, fcmCount: fcmTokens.length };
  }

  // Admin: Send notification to users with items in WISHLIST
  async sendToWishlist(
    type,
    title,
    message,
    metadata = null,
    status = "SENT",
    scheduledAt = null,
    senderId = null,
    send_push = null,
    send_email = null,
  ) {
    // Save ONE master notification
    const meta =
      typeof metadata === "object" && metadata !== null ? { ...metadata } : {};
    meta.target = "WISHLIST";
    if (send_push !== null) meta.send_push = send_push;
    if (send_email !== null) meta.send_email = send_email;

    await this.saveNotification(
      null,
      type,
      title,
      message,
      meta,
      status,
      scheduledAt,
      senderId,
    );

    const wishlistUsers = await Wishlist.findAll({
      attributes: [
        [sequelize.fn("DISTINCT", sequelize.col("user_id")), "user_id"],
      ],
    });

    const userIds = wishlistUsers.map((w) => w.user_id);
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds }, is_active: true },
      attributes: ["id", "fcm_token"],
    });

    const fcmTokens = users
      .map((u) => u.fcm_token)
      .filter((t) => t && status === "SENT");

    if (fcmTokens.length > 0) {
      await this.sendFCMMulticast(fcmTokens, title, message, meta);
    }

    return { dbCount: 1, fcmCount: fcmTokens.length };
  }

  // Admin: Send notification to users whose subscription is EXPIRING (within 7 days)
  async sendToExpiring(
    type,
    title,
    message,
    metadata = null,
    status = "SENT",
    scheduledAt = null,
    senderId = null,
    send_push = null,
    send_email = null,
  ) {
    // Save ONE master notification
    const meta =
      typeof metadata === "object" && metadata !== null ? { ...metadata } : {};
    meta.target = "EXPIRING";
    if (send_push !== null) meta.send_push = send_push;
    if (send_email !== null) meta.send_email = send_email;

    await this.saveNotification(
      null,
      type,
      title,
      message,
      meta,
      status,
      scheduledAt,
      senderId,
    );

    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);

    const expiringSubs = await Subscription.findAll({
      where: {
        status: "active",
        end_date: {
          [Op.between]: [today, sevenDaysLater],
        },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fcm_token"],
          where: { is_active: true },
        },
      ],
    });

    const fcmTokens = expiringSubs
      .map((s) => s.user?.fcm_token)
      .filter((t) => t && status === "SENT");

    if (fcmTokens.length > 0) {
      await this.sendFCMMulticast(fcmTokens, title, message, meta);
    }

    return { dbCount: 1, fcmCount: fcmTokens.length };
  }

  // Get user notifications (paginated)
  async getUserNotifications(userId, userType, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const where = {
      status: "SENT",
    };

    if (userType === "admin") {
      // Admins see their specific ones + System-level ones (where userId is null)
      where.userId = { [Op.or]: [userId, null] };
    } else {
      // Regular users only see their specific ones + Broadcasts meant for ALL
      where[Op.or] = [
        { userId: userId },
        { 
          userId: null,
          [Op.and]: [
            sequelize.literal("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.target')) = 'ALL'")
          ]
        }
      ];
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
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
  async getUnreadCount(userId, userType) {
    const where = {
      is_read: false,
      status: "SENT",
    };

    if (userType === "admin") {
      where.userId = { [Op.or]: [userId, null] };
    } else {
      where[Op.or] = [
        { userId: userId },
        { 
          userId: null,
          [Op.and]: [
            sequelize.literal("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.target')) = 'ALL'")
          ]
        }
      ];
    }

    return await Notification.count({ where });
  }

  // Mark a single notification as read
  async markAsRead(notificationId, userId, userType) {
    const where = { id: notificationId };
    
    if (userType === "admin") {
      where.userId = { [Op.or]: [userId, null] };
    } else {
      where.userId = userId;
    }

    const notification = await Notification.findOne({ where });
    if (!notification) return null;

    notification.is_read = true;
    await notification.save();
    return notification;
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId, userType) {
    const where = { is_read: false };
    
    if (userType === "admin") {
      where.userId = { [Op.or]: [userId, null] };
    } else {
      where.userId = userId;
    }

    await Notification.update({ is_read: true }, { where });
    return true;
  }

  // Admin: Mark all notifications in the system as read
  async markAllAsReadAdmin() {
    await Notification.update(
      { is_read: true },
      { where: { is_read: false } }, // All unread notifications
    );
    return true;
  }

  // Delete a single notification
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId: userId },
    });
    if (!notification) return false;

    await notification.destroy();
    return true;
  }

  // Delete all notifications for a user
  async deleteAllNotifications(userId) {
    await Notification.destroy({
      where: { userId: userId },
    });
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
      where: { userId: userId },
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
    if (!category) throw new Error("Category not found.");

    const [fav, created] = await UserFavoriteCategory.findOrCreate({
      where: { userId: userId, categoryId: categoryId },
    });

    if (!created) throw new Error("This category is already in your favorites.");
    return fav;
  }

  async removeFavoriteCategory(userId, categoryId) {
    const fav = await UserFavoriteCategory.findOne({
      where: { userId: userId, categoryId: categoryId },
    });
    if (!fav) throw new Error("This category is not in your favorites.");

    await fav.destroy();
    return true;
  }

  async syncFavoriteCategories(userId, categoryIds) {
    // Replace all favorites with the new list
    await UserFavoriteCategory.destroy({ where: { userId: userId } });

    if (categoryIds && categoryIds.length > 0) {
      const records = categoryIds.map((category_id) => ({
        userId: userId,
        categoryId: category_id,
      }));
      await UserFavoriteCategory.bulkCreate(records, {
        ignoreDuplicates: true,
      });
    }

    return await this.getFavoriteCategories(userId);
  }

  // Admin: Get all notifications (system-wide)
  async getAllNotificationsAdmin({
    page = 1,
    limit = 20,
    userId,
    type,
    status,
    target,
  }) {
    const offset = (page - 1) * limit;
    const where = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (status) where.status = status.toUpperCase();
    if (target === "ALL") {
      where.userId = null;
    } else if (target === "USER") {
      where.userId = { [Op.ne]: null };
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
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

  // Admin: Delete any notification
  async deleteNotificationAdmin(notificationId) {
    const notification = await Notification.findByPk(notificationId);
    if (!notification) return false;
    await notification.destroy();
    return true;
  }

  // Admin: Process background scheduled notifications (Run by Cron)
  async processScheduledNotifications() {
    const now = new Date();
    const pendingNotifications = await Notification.findAll({
      where: {
        status: "PENDING",
        scheduled_at: { [Op.lte]: now },
      },
    });

    for (const notif of pendingNotifications) {
      try {
        const target = notif.metadata?.target || "ALL";
        // Convert to SENT before processing to avoid race conditions
        notif.status = "SENT";
        await notif.save();

        if (target === "ALL") {
          await this.sendToAll(
            notif.type,
            notif.title,
            notif.message,
            notif.metadata,
            notif.status,
            notif.scheduled_at,
            null,
            notif.metadata?.send_push,
            notif.metadata?.send_email,
          );
        } else if (target === "CATEGORY") {
          await this.sendToCategory(
            notif.metadata.category_id,
            notif.type,
            notif.title,
            notif.message,
            notif.metadata,
            notif.status,
            notif.scheduled_at,
            null,
            notif.metadata?.send_push,
            notif.metadata?.send_email,
          );
        } else if (target === "SUBSCRIBED") {
          await this.sendToSubscribed(
            notif.type,
            notif.title,
            notif.message,
            notif.metadata,
            notif.status,
            notif.scheduled_at,
            null,
            notif.metadata?.send_push,
            notif.metadata?.send_email,
          );
        } else if (target === "WISHLIST") {
          await this.sendToWishlist(
            notif.type,
            notif.title,
            notif.message,
            notif.metadata,
            notif.status,
            notif.scheduled_at,
            null,
            notif.metadata?.send_push,
            notif.metadata?.send_email,
          );
        } else if (target === "EXPIRING") {
          await this.sendToExpiring(
            notif.type,
            notif.title,
            notif.message,
            notif.metadata,
            notif.status,
            notif.scheduled_at,
            null,
            notif.metadata?.send_push,
            notif.metadata?.send_email,
          );
        }
      } catch (err) {
        console.error(
          `Failed to process scheduled notification ${notif.id}:`,
          err,
        );
        notif.status = "FAILED";
        await notif.save();
      }
    }
  }

  // Admin: Get stats
  async getNotificationStatsAdmin() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalNotifications = await Notification.count();
      const unreadCount = await Notification.count({
        where: { is_read: false },
      });
      const broadcastCount = await Notification.count({
        where: { userId: null },
      });
      const pendingCount = await Notification.count({
        where: { status: "PENDING" },
      });
      const recurringCount = await Notification.count({
        where: { status: "RECURRING" },
      });
      const failedCount = await Notification.count({
        where: { status: "FAILED" },
      });

      const sentToday = await Notification.count({
        where: {
          status: "SENT",
          createdAt: { [Op.gte]: today },
        },
      });

      return {
        totalNotifications,
        unreadCount,
        sentToday,
        broadcastCount,
        pendingCount,
        recurringCount,
        failedCount,
      };
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      return {
        totalNotifications: 0,
        unreadCount: 0,
        sentToday: 0,
        broadcastCount: 0,
        pendingCount: 0,
        recurringCount: 0,
        failedCount: 0,
      };
    }
  }

  // Auto-Cleanup: Delete notifications older than 30 days
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedCount = await Notification.destroy({
        where: {
          createdAt: { [Op.lt]: thirtyDaysAgo },
        },
      });

      if (deletedCount > 0) {
        console.log(
          `[CLEANUP] 🧹 Deleted ${deletedCount} notifications older than 30 days.`,
        );
      }
      return deletedCount;
    } catch (error) {
      console.error("[CLEANUP] ❌ Notification cleanup failed:", error.message);
      return 0;
    }
  }
}

export default new NotificationService();
