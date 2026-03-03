import { Payment, User, Book } from "../models/index.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

class AnalyticsService {
  async getRevenueStats() {
    const revenue = await Payment.findAll({
      attributes: [
        "payment_type",
        [sequelize.fn("SUM", sequelize.col("amount")), "total_amount"],
      ],
      where: {
        status: "captured",
      },
      group: ["payment_type"],
    });

    const stats = {
      subscriptionIncome: 0,
      ecommerceIncome: 0,
      marketplaceCommission: 0, // Mocked for now as marketplace is not fully implemented
    };

    revenue.forEach((item) => {
      const type = item.getDataValue("payment_type");
      const total = parseFloat(item.getDataValue("total_amount")) || 0;
      if (type === "subscription") {
        stats.subscriptionIncome = total;
      } else if (type === "book_purchase") {
        stats.ecommerceIncome = total;
      }
    });

    // Marketplace commission mockup (5% of ecommerce income as a placeholder)
    stats.marketplaceCommission = stats.ecommerceIncome * 0.05;

    return stats;
  }

  async getEngagementStats() {
    // Active users count
    const activeUsers = await User.count({
      where: { is_active: true },
    });

    // Popular books based on captured book purchases
    // Refactored to a 2-step process to be 100% robust against strict SQL modes on production
    const topPaymentStats = await Payment.findAll({
      attributes: [
        "book_id",
        [sequelize.fn("COUNT", sequelize.col("book_id")), "sales_count"],
      ],
      where: {
        payment_type: "book_purchase",
        status: "captured",
        book_id: { [Op.ne]: null },
      },
      group: ["book_id"],
      order: [[sequelize.literal("sales_count"), "DESC"]],
      limit: 5,
      raw: true,
    });

    const bookIds = topPaymentStats.map((s) => s.book_id);

    // Fetch book details for these IDs
    const booksDetails = await Book.findAll({
      where: { id: bookIds },
      attributes: ["id", "title", "author", "thumbnail", "slug"],
    });

    // Map details back to stats
    const popularBooks = topPaymentStats
      .map((stat) => {
        const bookDetail = booksDetails.find((b) => b.id === stat.book_id);
        return {
          book_id: stat.book_id,
          sales_count: parseInt(stat.sales_count) || 0,
          book: bookDetail || null,
        };
      })
      .filter((item) => item.book !== null); // Only return if book info exists

    // Mocked top audiobooks (if you implement later)
    const topAudiobooks = [];

    return {
      activeUsers,
      popularBooks,
      topAudiobooks,
    };
  }
}

export default new AnalyticsService();
