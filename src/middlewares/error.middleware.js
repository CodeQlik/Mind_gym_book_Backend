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

  let statusCode = err.statusCode || err.status || 500;
  
  // If generic Error with "not found" message, default to 404
  if (err.message && err.message.toLowerCase().includes("not found")) {
    statusCode = 404;
  }

  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorMiddleware;
