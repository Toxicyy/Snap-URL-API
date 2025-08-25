import dotenv from "dotenv";
dotenv.config();

export const config = {
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",

  // Database
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/snapurl",

  // JWT Configuration
  jwtSecret:
    process.env.JWT_SECRET || "fallback_jwt_secret_change_in_production",
  jwtExpire: process.env.JWT_EXPIRE || "7d",

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || "*",

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // SnapURL Specific
  baseUrl: process.env.BASE_URL || "http://localhost:5000",
  shortCodeLength: parseInt(process.env.SHORT_CODE_LENGTH) || 7,

  // Analytics Features
  enableAnalytics: process.env.ENABLE_ANALYTICS === "true",
  enableGeolocation: process.env.ENABLE_GEOLOCATION === "true",

  // URL Configuration
  maxUrlLength: parseInt(process.env.MAX_URL_LENGTH) || 2048,
  allowCustomAlias: process.env.ALLOW_CUSTOM_ALIAS !== "false",
};
