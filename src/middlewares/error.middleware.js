import logger from "../utils/logger.js";

const errorMiddleware = (err, req, res, next) => {
  logger.error(`${req.method} ${req.url}`, {
    message: err.message,
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user ? req.user.id : "Guest",
  });

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorMiddleware;
