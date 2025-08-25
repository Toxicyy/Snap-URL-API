import { config } from "../config/config.js";
import { ApiResponse } from "../utils/responses.js";

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error("Error:", err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = "Duplicate field value entered";

    // Specific messages for common duplicates
    if (err.keyPattern?.email) {
      message = "Email already exists";
    } else if (err.keyPattern?.shortCode) {
      message = "Short code already exists";
    } else if (err.keyPattern?.customAlias) {
      message = "Custom alias already taken";
    }

    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = { message, statusCode: 401 };
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = { message, statusCode: 401 };
  }

  // Rate limit error
  if (err.type === "entity.too.large") {
    const message = "Request body too large";
    error = { message, statusCode: 413 };
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Server Error";

  res
    .status(statusCode)
    .json(
      ApiResponse.error(
        message,
        config.nodeEnv === "development" ? { stack: err.stack } : null,
        statusCode
      )
    );
};
