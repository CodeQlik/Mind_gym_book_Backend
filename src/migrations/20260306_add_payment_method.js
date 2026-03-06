// Migration: Add payment_method column to orders and payments tables
// Run: node src/migrations/20260306_add_payment_method.js

import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";

async function up() {
  // 1. Add payment_method to orders table
  await sequelize.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method 
      ENUM('upi', 'card', 'prepaid', 'cod') 
      NOT NULL DEFAULT 'prepaid'
      AFTER refund_reason
  `);
  console.log("✅ orders.payment_method column added");

  // 2. Add payment_method to payments table
  await sequelize.query(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS payment_method 
      ENUM('upi', 'card', 'prepaid', 'cod') 
      NULL
      AFTER book_id
  `);
  console.log("✅ payments.payment_method column added");
}

async function down() {
  await sequelize.query(
    `ALTER TABLE orders DROP COLUMN IF EXISTS payment_method`,
  );
  await sequelize.query(
    `ALTER TABLE payments DROP COLUMN IF EXISTS payment_method`,
  );
  console.log("⏪ Rolled back payment_method columns");
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
