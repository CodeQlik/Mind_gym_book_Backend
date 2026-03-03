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
    // We fetch Book directly and use a subquery for sales_count to avoid GROUP BY issues in strict SQL modes
    const books = await Book.findAll({
      attributes: [
        "id",
        "title",
        "author",
        "thumbnail",
        "slug",
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM payments AS p
            WHERE p.book_id = Book.id
            AND p.payment_type = 'book_purchase'
            AND p.status = 'captured'
          )`),
          "sales_count",
        ],
      ],
      order: [[sequelize.literal("sales_count"), "DESC"]],
      limit: 5,
    });

    // Transform to match the expected format: { book_id, sales_count, book: { ... } }
    const popularBooks = books.map((book) => ({
      book_id: book.id,
      sales_count: parseInt(book.getDataValue("sales_count")) || 0,
      book: book,
    }));

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
