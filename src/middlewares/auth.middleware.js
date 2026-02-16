import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import sendResponse from "../utils/responseHandler.js";

export const verifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return sendResponse(
        res,
        401,
        false,
        "Unauthorized request. No token provided.",
      );
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || "secret");

    const user = await User.findByPk(decodedToken.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return sendResponse(res, 401, false, "Invalid access token.");
    }

    req.user = user;
    next();
  } catch (error) {
    return sendResponse(
      res,
      401,
      false,
      error?.message || "Invalid access token",
    );
  }
};

export const optionalVerifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET || "secret",
      );
      const user = await User.findByPk(decodedToken.id, {
        attributes: { exclude: ["password"] },
      });
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // If token is invalid, we just proceed as guest
    next();
  }
};
