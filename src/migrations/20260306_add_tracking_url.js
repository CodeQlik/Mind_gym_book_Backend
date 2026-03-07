// Migration: Add tracking_url column to orders table
// Run: node src/migrations/20260306_add_tracking_url.js

import sequelize from "../config/db.js";

async function up() {
  await sequelize.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS tracking_url VARCHAR(255) NULL AFTER courier_name
  `);
  console.log("✅ orders.tracking_url column added");
}

async function down() {
  await sequelize.query(
    `ALTER TABLE orders DROP COLUMN IF EXISTS tracking_url`,
  );
  console.log("⏪ Rolled back tracking_url column");
}

up()
  .then(() => {
    console.log("✅ Migration complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  });
