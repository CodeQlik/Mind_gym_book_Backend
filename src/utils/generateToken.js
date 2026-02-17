import jwt from "jsonwebtoken";
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.ACCESS_TOKEN_SECRET || "access_secret",
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d",
    },
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.REFRESH_TOKEN_SECRET || "refresh_secret",
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    },
  );
};
