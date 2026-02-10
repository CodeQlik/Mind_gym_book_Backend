import User from "./user.model.js";
import Address from "./address.model.js";
import Category from "./category.model.js";
import SubCategory from "./subCategory.model.js";
import Book from "./book.model.js";

// Associations
Category.hasMany(SubCategory, {
  foreignKey: "category_id",
  as: "subcategories",
});
SubCategory.belongsTo(Category, { foreignKey: "category_id", as: "category" });

SubCategory.hasMany(Book, { foreignKey: "subcategory_id", as: "books" });
Book.belongsTo(SubCategory, {
  foreignKey: "subcategory_id",
  as: "subcategory",
});

Category.hasMany(Book, { foreignKey: "category_id", as: "books" });
Book.belongsTo(Category, { foreignKey: "category_id", as: "category" });

export { User, Address, Category, SubCategory, Book };
