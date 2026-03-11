import cron from "node-cron";
import { Op } from "sequelize";
import { Subscription, User } from "../models/index.js";

export const runSubscriptionExpiryJob = async () => {
  const now = new Date();
  const { default: notificationService } =
    await import("../services/notification.service.js");

  try {
    // ── Step 1: Expire overdue Subscription records
    const expiringSoonIds = await Subscription.findAll({
      where: {
        status: "active",
        end_date: { [Op.lt]: now },
      },
      attributes: ["user_id"],
    });

    const [expiredSubCount] = await Subscription.update(
      { status: "expired" },
      {
        where: {
          status: "active",
          end_date: { [Op.lt]: now },
        },
      },
    );

    // ── Step 2: Update User.subscription_status to match
    const [expiredUserCount] = await User.update(
      { subscription_status: "expired" },
      {
        where: {
          subscription_status: "active",
          subscription_end_date: { [Op.lt]: now },
        },
      },
    );

    // Notify expired users
    for (const sub of expiringSoonIds) {
      try {
        await notificationService.sendToUser(
          sub.user_id,
          "SUBSCRIPTION_EXPIRED",
          "🔴 Membership Expired",
          "Your Mind Gym Book subscription has expired. Renew now to continue enjoying unlimited reading!",
        );
      } catch (e) {}
    }

    if (expiredSubCount > 0 || expiredUserCount > 0) {
      console.log(
        `[CRON] ✅ Expired: ${expiredSubCount} subscription(s), ${expiredUserCount} user(s) updated.`,
      );
    }

    // ── Step 3: Warn users expiring in 3 days
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);
    const threeDaysStart = new Date(threeDaysLater.setHours(0, 0, 0, 0));
    const threeDaysEnd = new Date(threeDaysLater.setHours(23, 59, 59, 999));

    const expiring3Days = await Subscription.findAll({
      where: {
        status: "active",
        end_date: { [Op.between]: [threeDaysStart, threeDaysEnd] },
      },
    });

    for (const sub of expiring3Days) {
      try {
        await notificationService.sendToUser(
          sub.user_id,
          "SUBSCRIPTION_EXPIRING_SOON",
          "⚠️ Subscription Expiring Soon",
          "Your membership will expire in 3 days. Renew now to avoid any interruption in your reading experience.",
          { days_left: "3" },
        );
      } catch (e) {}
    }

    // ── Step 4: Warn users expiring tomorrow (1 day)
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

    const expiringTomorrow = await Subscription.findAll({
      where: {
        status: "active",
        end_date: { [Op.between]: [tomorrowStart, tomorrowEnd] },
      },
    });

    for (const sub of expiringTomorrow) {
      try {
        await notificationService.sendToUser(
          sub.user_id,
          "SUBSCRIPTION_EXPIRING_SOON",
          "⌛ Subscription Expiring Tomorrow!",
          "Final Reminder: Your membership expires tomorrow. Don't lose access to your favorite books!",
          { days_left: "1" },
        );
      } catch (e) {}
    }

    // ── Step 5: Cleanup Old Notifications (Older than 30 days)
    await notificationService.cleanupOldNotifications();
  } catch (error) {
    console.error("[CRON] ❌ Subscription expiry job failed:", error.message);
  }
};

const initCronJobs = () => {
  // ── Job 1: Subscription Expiry (Daily)
  cron.schedule(
    "5 0 * * *", // 00:05 every day
    runSubscriptionExpiryJob,
    {
      timezone: "Asia/Kolkata", // IST timezone
    },
  );

  // ── Job 2: Background Notification Processor (Every Minute)
  cron.schedule("* * * * *", async () => {
    try {
      const { default: notificationService } =
        await import("../services/notification.service.js");
      await notificationService.processScheduledNotifications();
    } catch (error) {
      console.error("[CRON] Notification processor failed:", error);
    }
  });
};

export default initCronJobs;
