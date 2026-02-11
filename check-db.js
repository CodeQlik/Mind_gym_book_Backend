import { Book } from "./src/models/index.js";
import sequelize from "./src/config/db.js";

async function checkLastBook() {
  try {
    const book = await Book.findOne({ order: [["createdAt", "DESC"]] });
    if (book) {
      console.log("Last Book ID:", book.id);
      console.log("Thumbnail:", JSON.stringify(book.thumbnail, null, 2));
      console.log("PDF File:", JSON.stringify(book.pdf_file, null, 2));
    } else {
      console.log("No books found.");
    }
  } catch (error) {
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

checkLastBook();
