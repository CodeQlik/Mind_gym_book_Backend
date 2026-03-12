import subscriptionService from "../services/subscription.service.js";
import sendResponse from "../utils/responseHandler.js";

export const subscribeUser = async (req, res, next) => {
  try {
    const subscription = await subscriptionService.subscribeUser({
      ...req.body,
      user_id: req.user.id, // Assuming user id comes from auth middleware
    });
    return sendResponse(
      res,
      200,
      true,
      "Subscription activated successfully",
      subscription,
    );
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionStatus = async (req, res, next) => {
  try {
    const subscription = await subscriptionService.getUserSubscription(
      req.user.id,
    );
    if (!subscription) {
      return sendResponse(res, 200, true, "No active subscription found", {
        has_active_subscription: false,
        plan: {
          name: "Free Plan",
          book_read_limit: 5,
        },
      });
    }

    const plan = subscription.plan;
    const summary = {
      has_active_subscription: true,
      subscription_id: subscription.id,
      plan_name: plan?.name || subscription.plan_type,
      plan_type: subscription.plan_type,
      status: subscription.status,
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      days_remaining: Math.max(0, Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24))),
      usage: {
        books_read: subscription.books_read_count,
        limit: plan?.book_read_limit || 5,
        is_unlimited: plan?.book_read_limit === -1,
        remaining: plan?.book_read_limit === -1 ? "Unlimited" : Math.max(0, (plan?.book_read_limit || 5) - subscription.books_read_count),
      },
      device_limit: plan?.device_limit || 1
    };

    return sendResponse(
      res,
      200,
      true,
      "Subscription details fetched",
      summary,
    );
  } catch (error) {
    next(error);
  }
};

export const getAllSubscriptions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await subscriptionService.getAllSubscriptions(page, limit);
    return sendResponse(
      res,
      200,
      true,
      "All subscriptions fetched successfully",
      result,
    );
  } catch (error) {
    next(error);
  }
};

export const updateSubscriptionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const subscription = await subscriptionService.updateSubscriptionStatus(
      id,
      status,
    );
    return sendResponse(
      res,
      200,
      true,
      "Subscription status updated",
      subscription,
    );
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subscription = await subscriptionService.getSubscriptionById(id);
    if (!subscription) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }
    return sendResponse(
      res,
      200,
      true,
      "Subscription details fetched",
      subscription,
    );
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (!subscription) {
      return sendResponse(
        res,
        200,
        true,
        "No active subscription found for this user",
        null,
      );
    }
    return sendResponse(
      res,
      200,
      true,
      "User subscription details fetched",
      subscription,
    );
  } catch (error) {
    next(error);
  }
};
