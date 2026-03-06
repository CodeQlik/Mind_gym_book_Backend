import "dotenv/config";
import sequelize from "./src/config/db.js";

const unifyDatabase = async () => {
  try {
    console.log(
      "Starting Database Unification (Merging PDF and EPUB columns)...",
    );

    // 1. Add new unified column 'file_data'
    await sequelize.query(
      "ALTER TABLE books ADD COLUMN IF NOT EXISTS file_data JSON NULL AFTER published_date",
    );
    console.log("Column 'file_data' added.");

    // 2. Migrate existing data
    // Hum existing pdf_file aur epub_file ko ek JSON object mein merge kar rahe hain
    await sequelize.query(`
      UPDATE books 
      SET file_data = JSON_OBJECT(
        'pdf', IF(pdf_file IS NULL OR pdf_file = '', NULL, pdf_file),
        'epub', IF(epub_file IS NULL OR epub_file = '', NULL, epub_file)
      )
    `);
    console.log("Data migrated to 'file_data'.");

    console.log(
      "SUCCESS: Database unified. You can now update the model code.",
    );
  } catch (error) {
    console.error("ERROR during unification:", error.message);
  } finally {
    await sequelize.close();
  }
};

unifyDatabase();
