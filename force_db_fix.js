import "dotenv/config";
import sequelize from "./src/config/db.js";

const forceFix = async () => {
  try {
    console.log("Checking and forcing DB nullable columns...");

    // Force nullable on books table
    await sequelize.query("ALTER TABLE books MODIFY pdf_file JSON NULL");
    await sequelize.query("ALTER TABLE books MODIFY epub_file JSON NULL");

    // Check if columns exist
    const [cols] = await sequelize.query("SHOW COLUMNS FROM books");
    console.table(cols);

    console.log("SUCCESS: Database columns are now definitely NULLABLE.");
  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    await sequelize.close();
  }
};

forceFix();
