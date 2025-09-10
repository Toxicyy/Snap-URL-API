import rateLimit from "express-rate-limit";
import { ApiResponse } from "../utils/responses.js";

// Specific rate limiters for different endpoints

// Strict rate limiting for URL creation
export const createUrlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 URL creations per windowMs
  message: ApiResponse.error(
    "Too many URLs created, please try again after 15 minutes",
    null,
    429
  ),
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator to fix IPv6 issue
});

// Auth rate limiting
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: ApiResponse.error(
    "Too many authentication attempts, please try again after 15 minutes",
    null,
    429
  ),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Redirect rate limiting (very permissive)
export const redirectLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 redirects per minute per IP
  message: ApiResponse.error(
    "Too many redirect requests, please try again later",
    null,
    429
  ),
  standardHeaders: true,
  legacyHeaders: false,
  // Remove skip function to fix the issue
});

// Analytics rate limiting
export const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 50 analytics requests per windowMs
  message: ApiResponse.error(
    "Too many analytics requests, please try again after 15 minutes",
    null,
    429
  ),
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator to fix IPv6 issue
});
