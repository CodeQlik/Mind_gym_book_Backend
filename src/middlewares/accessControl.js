import { UserBook, Subscription, Book } from "../models/index.js";
import { Op } from "sequelize";

export const checkBookAccess = async (req, res, next) => {
  try {
    return next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
