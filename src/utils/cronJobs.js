import cron from "node-cron";
import { User } from "../models/index.js";
import { Op } from "sequelize";

const initCronJobs = () => {
  // हर रात 12 बजे यह स्क्रिप्ट चलेगी (Runs every night at midnight)
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("Running subscription expiry cron job...");
      const [updatedCount] = await User.update(
        { subscription_status: "expired" },
        {
          where: {
            subscription_status: "active",
            subscription_end_date: {
              [Op.lt]: new Date(),
            },
          },
        },
      );
      console.log(`Cron Job: ${updatedCount} users moved to expired.`);
    } catch (error) {
      console.error("Cron Job Error:", error);
    }
  });

  console.log("Subscription expiry cron job scheduled.");
};

export default initCronJobs;
