import "dotenv/config";
import sequelize from "./src/config/db.js";
import { QueryTypes } from "sequelize";

const fixDatabase = async () => {
  try {
    console.log("Starting DB fix...");

    // 1. Fix books table
    await sequelize.query(`
      ALTER TABLE books 
      MODIFY pdf_file JSON NULL,
      ADD COLUMN IF NOT EXISTS epub_file JSON NULL AFTER pdf_file
    `);
    console.log(
      "Books table updated: pdf_file is nullable and epub_file exists.",
    );

    // 2. Fix notifications table (optional but good to have)
    try {
      await sequelize.query(`
        ALTER TABLE notifications MODIFY user_id INT NULL
      `);
      console.log("Notifications table updated: user_id is nullable.");
    } catch (e) {
      console.log("Notification table update skipped or already done.");
    }

    console.log("SUCCESS: Database schema fixed manually.");
  } catch (error) {
    console.error("ERROR during DB fix:", error.message);
  } finally {
    await sequelize.close();
  }
};

fixDatabase();
