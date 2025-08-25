import Joi from "joi";
import { ApiResponse } from "../utils/responses.js";
import { config } from "../config/config.js";

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res
        .status(400)
        .json(ApiResponse.error("Validation failed", errors, 400));
    }

    next();
  };
};

// Validation schemas
export const schemas = {
  // Auth schemas
  register: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      "string.min": "Name must be at least 2 characters long",
      "string.max": "Name cannot exceed 50 characters",
      "any.required": "Name is required",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters long",
      "any.required": "Password is required",
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  }),

  // URL schemas
  createUrl: Joi.object({
    originalUrl: Joi.string()
      .uri({ scheme: ["http", "https"] })
      .max(config.maxUrlLength)
      .required()
      .messages({
        "string.uri": "Please provide a valid URL (http:// or https://)",
        "string.max": `URL cannot exceed ${config.maxUrlLength} characters`,
        "any.required": "Original URL is required",
      }),
    customAlias: Joi.string().alphanum().min(3).max(30).optional().messages({
      "string.alphanum": "Custom alias can only contain letters and numbers",
      "string.min": "Custom alias must be at least 3 characters long",
      "string.max": "Custom alias cannot exceed 30 characters",
    }),
    title: Joi.string().max(100).optional().messages({
      "string.max": "Title cannot exceed 100 characters",
    }),
    // Добавляем недостающие поля
    description: Joi.string().max(500).optional().messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
    generateQR: Joi.boolean().optional(),
    fetchMetadata: Joi.boolean().optional(),
    expiresIn: Joi.number().positive().max(365).optional().messages({
      "number.positive": "Expiration must be a positive number of days",
      "number.max": "Expiration cannot exceed 365 days",
    }),
  }),

  updateUrl: Joi.object({
    title: Joi.string().max(100).optional().messages({
      "string.max": "Title cannot exceed 100 characters",
    }),
    description: Joi.string().max(500).optional().messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
    isActive: Joi.boolean().optional(),
    expiresIn: Joi.number().positive().max(365).optional().messages({
      "number.positive": "Expiration must be a positive number of days",
      "number.max": "Expiration cannot exceed 365 days",
    }),
    generateQR: Joi.boolean().optional(),
    fetchMetadata: Joi.boolean().optional(),
  }),
};

// URL validation helper
export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
