import User from "./user.model.js";
import Address from "./address.model.js";
import Category from "./category.model.js";
import Book from "./book.model.js";
import Cart from "./cart.model.js";
import Wishlist from "./wishlist.model.js";
import Payment from "./payment.model.js";
import UserNote from "./note.model.js";
import Subscription from "./subscription.model.js";
import UserBook from "./userBook.model.js";
import Bookmark from "./bookmark.model.js";
import EmailVerification from "./emailVerification.model.js";
import Review from "./review.model.js";

// Associations

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

// Payment Associations
User.hasMany(Payment, { foreignKey: "user_id", as: "payments" });
Payment.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Subscription Associations
User.hasMany(Subscription, { foreignKey: "user_id", as: "subscriptions" });
Subscription.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Note Associations
User.hasMany(UserNote, { foreignKey: "user_id", as: "notes" });
UserNote.belongsTo(User, { foreignKey: "user_id", as: "user" });

// UserBook Associations
User.hasMany(UserBook, { foreignKey: "user_id", as: "purchased_books" });
UserBook.belongsTo(User, { foreignKey: "user_id", as: "user" });

Book.hasMany(UserBook, { foreignKey: "book_id", as: "purchased_by" });
UserBook.belongsTo(Book, { foreignKey: "book_id", as: "book" });

// Bookmark Associations
User.hasMany(Bookmark, { foreignKey: "user_id", as: "bookmarks" });
Bookmark.belongsTo(User, { foreignKey: "user_id", as: "user" });

Book.hasMany(Bookmark, { foreignKey: "book_id", as: "bookmarks" });
Bookmark.belongsTo(Book, { foreignKey: "book_id", as: "book" });

// Review Associations
User.hasMany(Review, { foreignKey: "user_id", as: "reviews" });
Review.belongsTo(User, { foreignKey: "user_id", as: "user" });

Book.hasMany(Review, { foreignKey: "book_id", as: "reviews" });
Review.belongsTo(Book, { foreignKey: "book_id", as: "book" });

export {
  User,
  Address,
  Category,
  Book,
  Cart,
  Wishlist,
  Payment,
  UserNote,
  Subscription,
  UserBook,
  Bookmark,
  EmailVerification,
  Review,
};
