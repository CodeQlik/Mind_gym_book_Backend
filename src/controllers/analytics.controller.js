import analyticsService from "../services/analytics.service.js";

class AnalyticsController {
  async getDashboardStats(req, res) {
    try {
      const revenue = await analyticsService.getRevenueStats();
      const engagement = await analyticsService.getEngagementStats();

      return res.status(200).json({
        success: true,
        data: {
          revenue,
          engagement,
        },
      });
    } catch (error) {
      console.error("Analytics Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch analytics data",
        error: error.message,
      });
    }
  }

  async getTopSellingBooksThisWeek(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const books = await analyticsService.getTopSellingBooksThisWeek(limit);

      return res.status(200).json({
        success: true,
        count: books.length,
        data: books,
      });
    } catch (error) {
      console.error("Top Selling Books This Week API Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch top selling books for this week",
        error: error.message,
      });
    }
  }
}

export default new AnalyticsController();
