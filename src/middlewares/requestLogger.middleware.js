import logger from "../utils/logger.js";

const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log when request finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      user: req.user ? req.user.id : "Guest",
    };

    const message = `${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`;

    if (res.statusCode >= 400) {
      logger.warn(message, logData);
    } else {
      logger.info(message, logData);
    }
  });

  next();
};

export default requestLogger;
