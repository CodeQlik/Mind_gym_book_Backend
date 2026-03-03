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
    const activeUsers = await User.count({
      where: { is_active: true },
    });

    const popularBooks = await Payment.findAll({
      attributes: [
        "book_id",
        [sequelize.fn("COUNT", sequelize.col("book_id")), "sales_count"],
      ],
      where: {
        payment_type: "book_purchase",
        status: "captured",
        book_id: { [Op.ne]: null },
      },
      include: [
        {
          model: Book,
          as: "book",
          attributes: ["title", "author", "thumbnail", "slug"],
        },
      ],
      group: [sequelize.col("Payment.book_id"), sequelize.col("book.id")],
      order: [[sequelize.literal("sales_count"), "DESC"]],
      limit: 5,
    });

    // Mocked audiobook stats for now
    const topAudiobooks = [];

    return {
      activeUsers,
      popularBooks,
      topAudiobooks,
    };
  }
}

export default new AnalyticsService();
