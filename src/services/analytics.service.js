import { Payment, User, Book, Order, OrderItem } from "../models/index.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

class AnalyticsService {
  async getRevenueStats() {
    // 1. Subscription Income from captured payments
    const subPaymentArr = await Payment.findAll({
      attributes: [[sequelize.fn("SUM", sequelize.col("amount")), "total"]],
      where: { payment_type: "subscription", status: "captured" },
      raw: true,
    });
    const subscriptionIncome = parseFloat(subPaymentArr[0]?.total) || 0;

    // 2. E-commerce Income from Paid Orders (Physical + Marketplace)
    // Pulling directly from Orders table for maximum accuracy
    const orderRevenueArr = await Order.findAll({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("total_amount")), "total"],
      ],
      where: { payment_status: "paid" },
      raw: true,
    });
    const ecommerceIncome = parseFloat(orderRevenueArr[0]?.total) || 0;

    const stats = {
      subscriptionIncome,
      ecommerceIncome,
      marketplaceCommission: ecommerceIncome * 0.05, // Placeholder 5% commission
    };

    return stats;
  }

  async getEngagementStats() {
    // Active users count
    const activeUsers = await User.count({
      where: { is_active: true },
    });

    // Popular books based on OrderItems from PAID orders
    // Summing quantities to get true sales count
    const topSalesStats = await OrderItem.findAll({
      attributes: [
        "book_id",
        [sequelize.fn("SUM", sequelize.col("quantity")), "sales_count"],
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: { payment_status: "paid" },
          attributes: [],
        },
      ],
      group: ["book_id"],
      order: [[sequelize.literal("sales_count"), "DESC"]],
      limit: 10,
      raw: true,
    });

    const bookIds = topSalesStats.map((s) => s.book_id);

    // Fetch book details for these IDs
    const booksDetails = await Book.findAll({
      where: { id: bookIds },
      attributes: ["id", "title", "author", "thumbnail", "slug"],
    });

    // Map details back to stats
    const popularBooks = topSalesStats
      .map((stat) => {
        const bookDetail = booksDetails.find((b) => b.id === stat.book_id);
        return {
          book_id: stat.book_id,
          sales_count: parseInt(stat.sales_count) || 0,
          book: bookDetail || null,
        };
      })
      .filter((item) => item.book !== null);

    // Mocked top audiobooks (if you implement later)
    const topAudiobooks = [];

    // Total users (excluding admins) and books count
    const totalUsers = await User.count({ where: { user_type: "user" } });
    const totalBooks = await Book.count({ where: { is_active: true } });

    // Subscription Distribution
    const subscriptionStats = await User.findAll({
      attributes: [
        ["subscription_plan", "plan"],
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      where: {
        subscription_status: "active",
        user_type: "user",
      },
      group: ["subscription_plan"],
      raw: true,
    });

    const activeSubscribers = await User.count({
      where: { subscription_status: "active", user_type: "user" },
    });

    return {
      activeUsers,
      totalUsers,
      totalBooks,
      activeSubscribers,
      subscriptionDistribution: subscriptionStats,
      popularBooks,
      topAudiobooks,
    };
  }

  async getTopSellingBooksThisWeek(limit = 10) {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday...

    // Calculate 7 days ago from today for a rolling week view
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const stats = await OrderItem.findAll({
      attributes: [
        "book_id",
        [sequelize.fn("SUM", sequelize.col("quantity")), "sales_count"],
      ],
      include: [
        {
          model: Order,
          as: "order",
          where: {
            payment_status: "paid",
            created_at: {
              [Op.gte]: startOfWeek,
            },
          },
          attributes: [],
        },
      ],
      group: ["book_id"],
      order: [[sequelize.literal("sales_count"), "DESC"]],
      limit,
      raw: true,
    });

    if (!stats || stats.length === 0) return [];

    const bookIds = stats.map((s) => s.book_id);
    const books = await Book.findAll({
      where: { id: bookIds },
      attributes: ["id", "title", "author", "thumbnail", "slug", "price"],
    });

    return stats
      .map((stat) => {
        const bookDetail = books.find((b) => b.id === stat.book_id);
        return {
          book_id: stat.book_id,
          sales_count: parseInt(stat.sales_count) || 0,
          book: bookDetail || null,
        };
      })
      .filter((item) => item.book !== null);
  }
}

export default new AnalyticsService();
