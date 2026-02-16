import cron from "node-cron";
import { Subscription, User } from "../models/index.js";
import { Op } from "sequelize";

const initCronJobs = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const now = new Date();
      console.log("Running subscription expiry cron job...");

      // 1. Update Subscription records
      const [updatedSubscriptionCount] = await Subscription.update(
        { status: "expired" },
        {
          where: {
            status: "active",
            end_date: {
              [Op.lt]: now,
            },
          },
        },
      );

      // 2. Update User records to mirror the status
      const [updatedUserCount] = await User.update(
        { subscription_status: "expired" },
        {
          where: {
            subscription_status: "active",
            subscription_end_date: {
              [Op.lt]: now,
            },
          },
        },
      );

      console.log(
        `Cron Job: ${updatedSubscriptionCount} subscriptions and ${updatedUserCount} users moved to expired.`,
      );
    } catch (error) {
      console.error("Cron Job Error:", error);
    }
  });

  console.log("Subscription expiry cron job scheduled.");
};

export default initCronJobs;
