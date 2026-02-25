import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import sendResponse from "../utils/responseHandler.js";

export const verifyJWT = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.header("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    token = token?.trim();

    if (!token) {
      return sendResponse(
        res,
        401,
        false,
        "Unauthorized request. No token provided.",
      );
    }

    const secret = process.env.ACCESS_TOKEN_SECRET || "access_secret";

    const decodedToken = jwt.verify(token, secret);

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
    const authHeader = req.header("Authorization");
    const token = (
      authHeader?.replace("Bearer ", "") || req.cookies?.accessToken
    )?.trim();

    if (token) {
      const secret = process.env.ACCESS_TOKEN_SECRET || "access_secret";

      const decodedToken = jwt.verify(token, secret);
      const user = await User.findByPk(decodedToken.id, {
        attributes: { exclude: ["password"] },
      });
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};
