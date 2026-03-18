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
import Order from "./order.model.js";
import OrderItem from "./orderItem.model.js";
import Coupon from "./coupon.model.js";
import SupportTicket from "./supportTicket.model.js";
import SupportMessage from "./supportMessage.model.js";
import UserSession from "./userSession.model.js";
import CMSPage from "./cmsPage.model.js";
import Blog from "./blog.model.js";
import Testimonial from "./testimonial.model.js";
import Audiobook from "./audiobook.model.js";
import Faq from "./faq.model.js";
import Setting from "./setting.model.js";
import ContactQuery from "./contactQuery.model.js";
import logger from "../utils/logger.js";


// Associations

Category.hasMany(Book, { foreignKey: "category_id", as: "books" });
Book.belongsTo(Category, { foreignKey: "category_id", as: "category" });

// Session Associations
User.hasMany(UserSession, { foreignKey: "user_id", as: "sessions" });
UserSession.belongsTo(User, { foreignKey: "user_id", as: "user" });

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

// Order Associations
User.hasMany(Order, { foreignKey: "user_id", as: "orders" });
Order.belongsTo(User, { foreignKey: "user_id", as: "user" });

Address.hasMany(Order, { foreignKey: "address_id", as: "orders" });
Order.belongsTo(Address, { foreignKey: "address_id", as: "address" });

// OrderItem Associations
Order.hasMany(OrderItem, { foreignKey: "order_id", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "order_id", as: "order" });

Book.hasMany(OrderItem, { foreignKey: "book_id", as: "order_items" });
OrderItem.belongsTo(Book, { foreignKey: "book_id", as: "book" });

// Coupon Associations
Coupon.hasMany(Order, { foreignKey: "coupon_id", as: "orders" });
Order.belongsTo(Coupon, { foreignKey: "coupon_id", as: "coupon" });

// Support Associations
User.hasMany(SupportTicket, { foreignKey: "user_id", as: "support_tickets" });
SupportTicket.belongsTo(User, { foreignKey: "user_id", as: "user" });

Order.hasMany(SupportTicket, { foreignKey: "order_id", as: "support_tickets" });
SupportTicket.belongsTo(Order, { foreignKey: "order_id", as: "order" });

SupportTicket.hasMany(SupportMessage, {
  foreignKey: "ticket_id",
  as: "messages",
});
SupportMessage.belongsTo(SupportTicket, {
  foreignKey: "ticket_id",
  as: "ticket",
});

User.hasMany(SupportMessage, {
  foreignKey: "sender_id",
  as: "support_messages",
});
SupportMessage.belongsTo(User, { foreignKey: "sender_id", as: "sender" });

// Blog Associations
Category.hasMany(Blog, { foreignKey: "category_id", as: "blogs" });
Blog.belongsTo(Category, { foreignKey: "category_id", as: "category" });

// Audiobook Associations
Book.hasMany(Audiobook, { foreignKey: "book_id", as: "audiobooks" });
Audiobook.belongsTo(Book, { foreignKey: "book_id", as: "book" });

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
  Order,
  OrderItem,
  Coupon,
  SupportTicket,
  SupportMessage,
  UserSession,
  CMSPage,
  Blog,
  Testimonial,
  Audiobook,
  Faq,
  Setting,
  ContactQuery,
};
