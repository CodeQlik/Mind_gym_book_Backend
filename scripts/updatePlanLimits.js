import sequelize from "../src/config/db.js";
import { QueryTypes } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const updatePlans = async () => {
  try {
    console.log("🚀 Starting database update for plans...");

    // 1. Update Monthly Plans
    await sequelize.query(
      `UPDATE plans 
       SET device_limit = 2, 
           book_read_limit = 50, 
           duration_months = 1,
           is_ad_free = 1
       WHERE plan_type = 'monthly'`,
      { type: QueryTypes.UPDATE }
    );
    console.log("✅ Monthly plans updated: 2 devices, 50 books.");

    // 2. Update Three Month Plans
    await sequelize.query(
      `UPDATE plans 
       SET device_limit = 3, 
           book_read_limit = 150, 
           duration_months = 3,
           is_ad_free = 1
       WHERE plan_type = 'three_month'`,
      { type: QueryTypes.UPDATE }
    );
    console.log("✅ Three-month plans updated: 3 devices, 150 books.");

    // 3. Update Annual Plans
    await sequelize.query(
      `UPDATE plans 
       SET device_limit = 5, 
           book_read_limit = 1000, 
           duration_months = 12,
           is_ad_free = 1
       WHERE plan_type = 'annual'`,
      { type: QueryTypes.UPDATE }
    );
    console.log("✅ Annual plans updated: 5 devices, 1000 books.");

    console.log("✨ All plans have been successfully updated in the live database!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating plans:", error.message);
    process.exit(1);
  }
};

updatePlans();
