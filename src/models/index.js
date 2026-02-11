import User from "./user.model.js";
import Address from "./address.model.js";
import Category from "./category.model.js";
import SubCategory from "./subCategory.model.js";
import Book from "./book.model.js";
import Cart from "./cart.model.js";
import Wishlist from "./wishlist.model.js";

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

// Cart Associations
User.hasMany(Cart, { foreignKey: "user_id", as: "cart_items" });
Cart.belongsTo(User, { foreignKey: "user_id", as: "user" });

Book.hasMany(Cart, { foreignKey: "book_id", as: "cart_items" });
Cart.belongsTo(Book, { foreignKey: "book_id", as: "book" });

// Wishlist Associations
User.hasMany(Wishlist, { foreignKey: "user_id", as: "wishlist_items" });
Wishlist.belongsTo(User, { foreignKey: "user_id", as: "user" });

Book.hasMany(Wishlist, { foreignKey: "book_id", as: "wishlisted_by" });
Wishlist.belongsTo(Book, { foreignKey: "book_id", as: "book" });

export { User, Address, Category, SubCategory, Book, Cart, Wishlist };
