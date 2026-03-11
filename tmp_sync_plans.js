import sequelize from "./src/config/db.js";

async function syncDb() {
  try {
    console.log("Adding is_ad_free column to plans table...");

    // Add column if it doesn't exist
    await sequelize.query(
      "ALTER TABLE plans ADD COLUMN is_ad_free BOOLEAN DEFAULT 0 AFTER status;",
    );

    // Update existing records
    await sequelize.query(
      "UPDATE plans SET is_ad_free = 1 WHERE plan_type != 'free';",
    );

    console.log("Database synced successfully!");
    process.exit(0);
  } catch (err) {
    if (err.message.includes("Duplicate column name")) {
      console.log("Column already exists.");
      process.exit(0);
    }
    console.error("Sync failed:", err.message);
    process.exit(1);
  }
}

syncDb();
