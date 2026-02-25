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
import Notification from "./notification.model.js";
import UserFavoriteCategory from "./userFavoriteCategory.model.js";
import Plan from "./plan.model.js";
import ReadingProgress from "./readingProgress.model.js";
import Highlight from "./highlight.model.js";
import Seller from "./seller.model.js";
import UsedBookListing from "./usedBookListing.model.js";
import Order from "./order.model.js";

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

Book.hasMany(Payment, { foreignKey: "book_id", as: "payments" });
Payment.belongsTo(Book, { foreignKey: "book_id", as: "book" });

// Subscription Associations
User.hasMany(Subscription, { foreignKey: "user_id", as: "subscriptions" });
Subscription.belongsTo(User, { foreignKey: "user_id", as: "user" });

Plan.hasMany(Subscription, { foreignKey: "plan_id", as: "subscriptions" });
Subscription.belongsTo(Plan, { foreignKey: "plan_id", as: "plan" });

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

// Notification Associations
User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });

// UserFavoriteCategory Associations
User.hasMany(UserFavoriteCategory, {
  foreignKey: "user_id",
  as: "favorite_categories",
});
UserFavoriteCategory.belongsTo(User, { foreignKey: "user_id", as: "user" });

Category.hasMany(UserFavoriteCategory, {
  foreignKey: "category_id",
  as: "favorited_by",
});
UserFavoriteCategory.belongsTo(Category, {
  foreignKey: "category_id",
  as: "category",
});

// Reading Progress Associations
User.hasMany(ReadingProgress, {
  foreignKey: "user_id",
  as: "reading_progress",
});
ReadingProgress.belongsTo(User, { foreignKey: "user_id", as: "user" });

Book.hasMany(ReadingProgress, {
  foreignKey: "book_id",
  as: "readers_progress",
});
ReadingProgress.belongsTo(Book, { foreignKey: "book_id", as: "book" });

// Highlight Associations
User.hasMany(Highlight, { foreignKey: "user_id", as: "highlights" });
Highlight.belongsTo(User, { foreignKey: "user_id", as: "user" });

Book.hasMany(Highlight, { foreignKey: "book_id", as: "user_highlights" });
Highlight.belongsTo(Book, { foreignKey: "book_id", as: "book" });

// Marketplace & Seller Associations
User.hasOne(Seller, { foreignKey: "user_id", as: "seller_profile" });
Seller.belongsTo(User, { foreignKey: "user_id", as: "user" });

Seller.hasMany(UsedBookListing, { foreignKey: "seller_id", as: "listings" });
UsedBookListing.belongsTo(Seller, { foreignKey: "seller_id", as: "seller" });

// Order Associations
User.hasMany(Order, { foreignKey: "user_id", as: "orders" });
Order.belongsTo(User, { foreignKey: "user_id", as: "user" });

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
  Notification,
  UserFavoriteCategory,
  Plan,
  ReadingProgress,
  Highlight,
  Seller,
  UsedBookListing,
  Order,
};
