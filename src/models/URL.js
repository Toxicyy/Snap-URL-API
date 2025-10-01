import mongoose from "mongoose";
import { config } from "../config/config.js";
import { validateUrl } from "../middleware/validation.js";
import { generateShortCode } from "../utils/shortCodeGenerator.js";

/**
 * URL Schema for SnapURL service
 * Manages shortened URLs with analytics, custom aliases, and metadata
 *
 * @swagger
 * components:
 *   schemas:
 *     URL:
 *       type: object
 *       required:
 *         - originalUrl
 *         - shortCode
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique URL identifier
 *         originalUrl:
 *           type: string
 *           format: uri
 *           description: The original long URL
 *         shortCode:
 *           type: string
 *           description: Unique short code for the URL
 *         customAlias:
 *           type: string
 *           description: Custom alias instead of generated code
 *         title:
 *           type: string
 *           description: User-defined title for the URL
 *         userId:
 *           type: string
 *           description: ID of the user who created this URL
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the URL is active for redirects
 *         clickCount:
 *           type: number
 *           default: 0
 *           description: Total number of clicks
 *         uniqueClicks:
 *           type: number
 *           default: 0
 *           description: Number of unique visitors
 *         lastClickedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last click
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Optional expiration date
 *         qrCode:
 *           type: object
 *           properties:
 *             dataUrl:
 *               type: string
 *               description: Base64 QR code data URL
 *             size:
 *               type: number
 *               description: QR code size in pixels
 *         metadata:
 *           type: object
 *           properties:
 *             domain:
 *               type: string
 *               description: Domain of original URL
 *             title:
 *               type: string
 *               description: Page title (if fetched)
 *             description:
 *               type: string
 *               description: Page description
 *             favicon:
 *               type: string
 *               description: Favicon URL
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "64a1b2c3d4e5f6789abcdef0"
 *         originalUrl: "https://example.com/very-long-url"
 *         shortCode: "K3n9mP2"
 *         customAlias: null
 *         title: "My Important Link"
 *         isActive: true
 *         clickCount: 42
 *         uniqueClicks: 28
 */

const urlSchema = new mongoose.Schema(
  {
    // Core URL data
    originalUrl: {
      type: String,
      required: [true, "Original URL is required"],
      trim: true,
      maxLength: [
        config.maxUrlLength,
        `URL cannot exceed ${config.maxUrlLength} characters`,
      ],
      validate: {
        validator: function (url) {
          return validateUrl(url);
        },
        message: "Please provide a valid URL with http:// or https://",
      },
    },

    shortCode: {
      type: String,
      required: [true, "Short code is required"],
      unique: true,
      trim: true,
      minLength: [3, "Short code must be at least 3 characters long"],
      maxLength: [30, "Short code cannot exceed 30 characters"],
      match: [
        /^[A-Za-z0-9_-]+$/,
        "Short code can only contain letters, numbers, hyphens, and underscores",
      ],
    },

    customAlias: {
      type: String,
      sparse: true, // Allows null values but ensures uniqueness when present
      trim: true,
      minLength: [3, "Custom alias must be at least 3 characters long"],
      maxLength: [30, "Custom alias cannot exceed 30 characters"],
      match: [
        /^[A-Za-z0-9_-]+$/,
        "Custom alias can only contain letters, numbers, hyphens, and underscores",
      ],
    },

    // User-defined metadata
    title: {
      type: String,
      trim: true,
      maxLength: [100, "Title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxLength: [500, "Description cannot exceed 500 characters"],
    },

    // Ownership and permissions
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Anonymous URLs allowed
      index: true,
    },

    // Status and lifecycle
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },

    // Analytics data
    clickCount: {
      type: Number,
      default: 0,
      min: [0, "Click count cannot be negative"],
      index: true,
    },

    uniqueClicks: {
      type: Number,
      default: 0,
      min: [0, "Unique clicks cannot be negative"],
    },

    lastClickedAt: {
      type: Date,
      default: null,
    },

    // QR Code data
    qrCode: {
      dataUrl: {
        type: String,
        default: null,
      },
      size: {
        type: Number,
        default: 256,
        enum: [128, 256, 512, 1024],
      },
      generatedAt: {
        type: Date,
        default: null,
      },
    },

    // Fetched metadata from original URL
    metadata: {
      domain: {
        type: String,
        index: true,
      },
      pageTitle: {
        type: String,
        maxLength: [200, "Page title cannot exceed 200 characters"],
      },
      pageDescription: {
        type: String,
        maxLength: [500, "Page description cannot exceed 500 characters"],
      },
      favicon: {
        type: String,
      },
      httpStatus: {
        type: Number,
        min: 100,
        max: 599,
      },
      lastChecked: {
        type: Date,
        default: null,
      },
    },

    // Advanced features
    tags: [
      {
        type: Array,
        maxLength: [30, "Tag cannot exceed 30 characters"],
      },
    ],

    // Security features
    password: {
      type: String,
      default: null,
      select: false, // Don't include in queries by default
    },

    // Geographic restrictions (future feature)
    geoRestrictions: {
      allowedCountries: [String],
      blockedCountries: [String],
    },

    // A/B testing support
    variants: [
      {
        name: String,
        url: String,
        weight: {
          type: Number,
          min: 0,
          max: 100,
          default: 100,
        },
        clicks: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Remove sensitive fields and add computed fields
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/**
 * Virtual for the complete short URL
 */
urlSchema.virtual("shortUrl").get(function () {
  const code = this.customAlias || this.shortCode;
  return `${config.baseUrl}/${code}`;
});

/**
 * Virtual for calculating click-through rate (CTR)
 * Useful for analytics dashboard
 */
urlSchema.virtual("clickThroughRate").get(function () {
  if (this.clickCount === 0) return 0;
  return Math.round((this.uniqueClicks / this.clickCount) * 100 * 100) / 100; // Round to 2 decimal places
});

/**
 * Virtual for URL age in days
 */
urlSchema.virtual("ageInDays").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

/**
 * Virtual for checking if URL is expired
 */
urlSchema.virtual("isExpired").get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

/**
 * Virtual for average clicks per day
 */
urlSchema.virtual("averageClicksPerDay").get(function () {
  const ageInDays = this.ageInDays || 1;
  return Math.round((this.clickCount / ageInDays) * 100) / 100;
});

/**
 * Pre-save middleware to generate short code if not provided
 */
urlSchema.pre("save", async function (next) {
  if (this.isNew && !this.shortCode) {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        this.shortCode = generateShortCode();

        // Check if this code already exists
        const existingUrl = await this.constructor.findOne({
          shortCode: this.shortCode,
        });
        if (!existingUrl) break;

        attempts++;
      } catch (error) {
        return next(error);
      }
    }

    if (attempts === maxAttempts) {
      return next(
        new Error(
          "Failed to generate unique short code after multiple attempts"
        )
      );
    }
  }

  next();
});

/**
 * Pre-save middleware to extract domain from URL
 */
urlSchema.pre("save", function (next) {
  if (this.isModified("originalUrl")) {
    try {
      const url = new URL(this.originalUrl);
      this.metadata.domain = URL_MODEL.hostname;
    } catch (error) {
      // Invalid URL, will be caught by validation
    }
  }

  next();
});

/**
 * Instance method to increment click count with analytics tracking
 * @param {Object} clickData - Additional click data (IP, user agent, etc.)
 * @returns {Promise<URL>} Updated URL document
 */
urlSchema.methods.recordClick = async function (clickData = {}) {
  try {
    this.clickCount += 1;
    this.lastClickedAt = new Date();

    // Track unique clicks based on IP or user ID
    const { isUnique = false } = clickData;
    if (isUnique) {
      this.uniqueClicks += 1;
    }

    return await this.save();
  } catch (error) {
    throw new Error("Failed to record click");
  }
};

/**
 * Instance method to check if URL is accessible
 * @returns {boolean} True if URL is active and not expired
 */
urlSchema.methods.isAccessible = function () {
  return this.isActive && !this.isExpired;
};

/**
 * Instance method to generate QR code for this URL
 * @param {Object} options - QR code generation options
 * @returns {Promise<URL>} Updated URL document with QR code
 */
urlSchema.methods.generateQRCode = async function (options = {}) {
  try {
    const { generateQRCode } = await import("../utils/qrGenerator.js");

    const qrOptions = {
      width: options.size || this.qrCode.size || 256,
      ...options,
    };

    const dataUrl = await generateQRCode(this.shortUrl, qrOptions);

    this.qrCode = {
      dataUrl,
      size: qrOptions.width,
      generatedAt: new Date(),
    };

    return await this.save();
  } catch (error) {
    throw new Error(`QR code generation failed: ${error.message}`);
  }
};

/**
 * Static method to find URLs by user with pagination
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Paginated results
 */
urlSchema.statics.findByUserPaginated = function (userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
    isActive = true,
  } = options;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };
  const query = { userId };

  if (isActive !== null) {
    query.isActive = isActive;
  }

  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate("userId", "name email");
};

/**
 * Static method to get popular URLs
 * @param {number} limit - Number of results to return
 * @param {number} days - Number of days to look back
 * @returns {Promise<URL[]>} Array of popular URLs
 */
urlSchema.statics.getPopularUrls = function (limit = 10, days = 7) {
  const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.find({
    isActive: true,
    lastClickedAt: { $gte: dateThreshold },
  })
    .sort({ clickCount: -1 })
    .limit(limit)
    .populate("userId", "name");
};

/**
 * Static method to get analytics summary
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} Analytics summary
 */
urlSchema.statics.getAnalyticsSummary = async function (filters = {}) {
  try {
    const matchStage = { isActive: true, ...filters };

    const [summary] = await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalUrls: { $sum: 1 },
          totalClicks: { $sum: "$clickCount" },
          totalUniqueClicks: { $sum: "$uniqueClicks" },
          avgClicksPerUrl: { $avg: "$clickCount" },
          topDomains: { $push: "$metadata.domain" },
        },
      },
    ]);

    return (
      summary || {
        totalUrls: 0,
        totalClicks: 0,
        totalUniqueClicks: 0,
        avgClicksPerUrl: 0,
        topDomains: [],
      }
    );
  } catch (error) {
    throw new Error("Analytics summary generation failed");
  }
};

/**
 * Static method to clean up expired URLs
 * @returns {Promise<Object>} Cleanup results
 */
urlSchema.statics.cleanupExpiredUrls = async function () {
  try {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    return {
      deletedCount: result.deletedCount,
      cleanupDate: new Date(),
    };
  } catch (error) {
    throw new Error("URL cleanup failed");
  }
};

// Indexes for performance optimization
urlSchema.index({ shortCode: 1 }, { unique: true });
urlSchema.index({ customAlias: 1 }, { unique: true, sparse: true });
urlSchema.index({ userId: 1, createdAt: -1 });
urlSchema.index({ isActive: 1 });
urlSchema.index({ clickCount: -1 });
urlSchema.index({ lastClickedAt: -1 });
urlSchema.index({ "metadata.domain": 1 });
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
urlSchema.index({ tags: 1 });

// Text index for search functionality
urlSchema.index({
  title: "text",
  description: "text",
  "metadata.pageTitle": "text",
  "metadata.pageDescription": "text",
});

const URL = mongoose.model("URL", urlSchema);

export default URL;
