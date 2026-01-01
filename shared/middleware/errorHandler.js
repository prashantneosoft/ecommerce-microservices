const logger = require("../utils/logger");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
  });

  if (process.env.NODE_ENV === "development") {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      stack: err.stack,
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    error: "Something went wrong",
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, errorHandler, asyncHandler };
