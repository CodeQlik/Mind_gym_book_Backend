import cron from "node-cron";
import { Op } from "sequelize";
import { Subscription, User } from "../models/index.js";

export const runSubscriptionExpiryJob = async () => {
  const now = new Date();

  try {
    // ── Step 1: Expire overdue Subscription records
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

    if (expiredSubCount > 0 || expiredUserCount > 0) {
      console.log(
        `[CRON] ✅ Expired: ${expiredSubCount} subscription(s), ${expiredUserCount} user(s) updated.`,
      );
    } else {
      console.log("[CRON] ✅ No expired subscriptions found. All good.");
    }

    // ── Step 3: Log subscriptions expiring in next 3 days (warning)
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringSoon = await Subscription.count({
      where: {
        status: "active",
        end_date: {
          [Op.gt]: now,
          [Op.lt]: in3Days,
        },
      },
    });

    if (expiringSoon > 0) {
      console.log(
        `[CRON] ⚠️  ${expiringSoon} subscription(s) expiring within 3 days.`,
      );
    }
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
