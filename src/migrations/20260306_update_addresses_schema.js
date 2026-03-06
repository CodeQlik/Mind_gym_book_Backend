// Migration: Update addresses table to match modern schema
// Run: node src/migrations/20260306_update_addresses_schema.js

import sequelize from "../config/db.js";

async function up() {
  // Add missing columns if they don't exist
  // We use raw SQL to be safe

  // name
  await sequelize.query(
    `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL AFTER id;`,
  );

  // phone
  await sequelize.query(
    `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS phone VARCHAR(255) NULL AFTER name;`,
  );

  // address_line1 (rename street if exists, or add new)
  // To be safe, we check if street exists and rename it, or just add address_line1
  try {
    await sequelize.query(
      `ALTER TABLE addresses CHANGE COLUMN street address_line1 VARCHAR(255) NOT NULL;`,
    );
    console.log("✅ Renamed street to address_line1");
  } catch (e) {
    await sequelize.query(
      `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255) NOT NULL AFTER phone;`,
    );
    console.log("✅ Added address_line1");
  }

  // address_line2
  await sequelize.query(
    `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255) NULL AFTER address_line1;`,
  );

  // pincode (rename pin_code if exists)
  try {
    await sequelize.query(
      `ALTER TABLE addresses CHANGE COLUMN pin_code pincode VARCHAR(255) NOT NULL;`,
    );
    console.log("✅ Renamed pin_code to pincode");
  } catch (e) {
    await sequelize.query(
      `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS pincode VARCHAR(255) NOT NULL AFTER state;`,
    );
    console.log("✅ Added pincode");
  }

  // addresstype
  await sequelize.query(
    `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS addresstype ENUM('home', 'work', 'other') NOT NULL DEFAULT 'home' AFTER country;`,
  );

  // is_default
  await sequelize.query(
    `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS is_default TINYINT(1) DEFAULT 0 AFTER addresstype;`,
  );

  console.log("🚀 Addresses table updated successfully!");
}

up()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  });
