import cron from "node-cron";
import { Subscription, User } from "../models/index.js";
import { Op } from "sequelize";

const initCronJobs = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const now = new Date();

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
    } catch (error) {}
  });
};

export default initCronJobs;
