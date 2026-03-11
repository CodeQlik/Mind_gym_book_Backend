import sequelize from "./src/config/db.js";
import { QueryTypes } from "sequelize";

async function updatePlans() {
  try {
    console.log("Setting paid plans to ad-free...");

    // Update existing paid plans
    await sequelize.query(
      "UPDATE plans SET is_ad_free = 1 WHERE plan_type != 'free'",
      { type: QueryTypes.UPDATE },
    );

    console.log("Plans updated successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Update failed:", err.message);
    process.exit(1);
  }
}

updatePlans();
