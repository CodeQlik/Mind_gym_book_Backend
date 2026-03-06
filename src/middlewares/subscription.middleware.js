import { Subscription, User } from "../models/index.js";
import sendResponse from "../utils/responseHandler.js";

export const checkSub = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const sub = await Subscription.findOne({
      where: { user_id: userId, status: "active" },
      order: [["createdAt", "DESC"]],
    });

    if (!sub) {
      return sendResponse(
        res,
        403,
        false,
        "Active subscription required to access this content.",
      );
    }

    // Expiry check
    if (new Date() > new Date(sub.end_date)) {
      await sub.update({ status: "expired" });
      await User.update(
        { subscription_status: "expired" },
        { where: { id: userId } },
      );
      return sendResponse(
        res,
        403,
        false,
        "Your subscription has expired. Please renew to continue.",
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
