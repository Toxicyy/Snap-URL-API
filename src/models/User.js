import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";

/**
 * User Schema for SnapURL service
 * Handles user authentication, profile management, and URL ownership
 *
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique user identifier
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address (unique)
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           default: user
 *           description: User role for access control
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Account status
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last login
 *         urlCount:
 *           type: number
 *           default: 0
 *           description: Total URLs created by user
 *         totalClicks:
 *           type: number
 *           default: 0
 *           description: Total clicks across all user's URLs
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "64a1b2c3d4e5f6789abcdef0"
 *         name: "John Doe"
 *         email: "john@example.com"
 *         role: "user"
 *         isActive: true
 *         urlCount: 15
 *         totalClicks: 342
 */

const userSchema = new mongoose.Schema(
  {
    // Basic user information
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minLength: [2, "Name must be at least 2 characters long"],
      maxLength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [6, "Password must be at least 6 characters long"],
      select: false, // Don't include password in queries by default
    },

    // User role and permissions
    role: {
      type: String,
      enum: {
        values: ["user", "admin", "demo"],
        message: "Role must be either user or admin",
      },
      default: "user",
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Activity tracking
    lastLogin: {
      type: Date,
      default: null,
    },

    // Statistics (updated by triggers/middleware)
    urlCount: {
      type: Number,
      default: 0,
      min: [0, "URL count cannot be negative"],
    },

    totalClicks: {
      type: Number,
      default: 0,
      min: [0, "Total clicks cannot be negative"],
    },

    // User preferences
    preferences: {
      defaultQRSize: {
        type: Number,
        default: 256,
        enum: [128, 256, 512, 1024],
      },
      defaultQRColor: {
        type: String,
        default: "#000000",
        match: [
          /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
          "Invalid hex color format",
        ],
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      analyticsRetention: {
        type: Number,
        default: 365, // days
        min: [30, "Analytics retention must be at least 30 days"],
        max: [730, "Analytics retention cannot exceed 2 years"],
      },
    },

    // API usage tracking
    apiUsage: {
      requestCount: {
        type: Number,
        default: 0,
      },
      lastRequestAt: {
        type: Date,
        default: null,
      },
      rateLimitResets: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Remove sensitive fields from JSON output
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/**
 * Virtual for user's full profile URL
 */
userSchema.virtual("profileUrl").get(function () {
  return `${config.baseUrl}/api/users/${this._id}`;
});

/**
 * Virtual for calculating user activity score
 * Based on URL creation and total clicks
 */
userSchema.virtual("activityScore").get(function () {
  const urlWeight = 2;
  const clickWeight = 1;
  return this.urlCount * urlWeight + this.totalClicks * clickWeight;
});

/**
 * Virtual for user's account age in days
 */
userSchema.virtual("accountAge").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

/**
 * Pre-save middleware to hash password
 * Only hashes if password is new or modified
 */
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-save middleware to update user statistics
 */
userSchema.pre("save", function (next) {
  // Update last login if it's being set
  if (this.isModified("lastLogin") && this.lastLogin) {
    this.apiUsage.lastRequestAt = new Date();
  }

  next();
});

/**
 * Instance method to check if entered password matches hashed password
 * @param {string} enteredPassword - Plain text password to check
 * @returns {Promise<boolean>} True if password matches, false otherwise
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

/**
 * Instance method to generate JWT token
 * @param {string} expiresIn - Token expiration time (default from config)
 * @returns {string} Signed JWT token
 */
userSchema.methods.generateToken = function (expiresIn = config.jwtExpire) {
  try {
    return jwt.sign(
      {
        id: this._id,
        email: this.email,
        role: this.role,
      },
      config.jwtSecret,
      {
        expiresIn,
        issuer: "snapurl-api",
        audience: "snapurl-users",
      }
    );
  } catch (error) {
    throw new Error("Token generation failed");
  }
};

/**
 * Instance method to get user's safe profile data
 * Excludes sensitive information
 * @returns {Object} Safe user profile data
 */
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();

  // Remove sensitive fields
  delete userObject.password;
  delete userObject.apiUsage;
  delete userObject.__v;

  return userObject;
};

/**
 * Instance method to update user statistics
 * @param {Object} updates - Statistics to update
 * @returns {Promise<User>} Updated user document
 */
userSchema.methods.updateStats = async function (updates) {
  try {
    const { urlCount, totalClicks } = updates;

    if (urlCount !== undefined) {
      this.urlCount = Math.max(0, this.urlCount + urlCount);
    }

    if (totalClicks !== undefined) {
      this.totalClicks = Math.max(0, this.totalClicks + totalClicks);
    }

    return await this.save();
  } catch (error) {
    throw new Error("Statistics update failed");
  }
};

/**
 * Static method to find users by activity level
 * @param {string} level - Activity level ('low', 'medium', 'high')
 * @param {number} limit - Maximum number of results
 * @returns {Promise<User[]>} Array of users matching activity level
 */
userSchema.statics.findByActivityLevel = function (
  level = "medium",
  limit = 10
) {
  let activityFilter;

  switch (level) {
    case "low":
      activityFilter = {
        $or: [{ urlCount: { $lte: 5 } }, { totalClicks: { $lte: 50 } }],
      };
      break;
    case "high":
      activityFilter = { urlCount: { $gte: 50 }, totalClicks: { $gte: 1000 } };
      break;
    default: // medium
      activityFilter = {
        urlCount: { $gt: 5, $lt: 50 },
        totalClicks: { $gt: 50, $lt: 1000 },
      };
  }

  return this.find(activityFilter)
    .select("-password")
    .limit(limit)
    .sort({ totalClicks: -1 });
};

/**
 * Static method to get user analytics summary
 * @returns {Promise<Object>} Analytics summary
 */
userSchema.statics.getAnalyticsSummary = async function () {
  try {
    const [summary] = await this.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: [{ $eq: ["$isActive", true] }, 1, 0],
            },
          },
          totalUrls: { $sum: "$urlCount" },
          totalClicks: { $sum: "$totalClicks" },
          avgUrlsPerUser: { $avg: "$urlCount" },
          avgClicksPerUser: { $avg: "$totalClicks" },
        },
      },
    ]);

    return (
      summary || {
        totalUsers: 0,
        activeUsers: 0,
        totalUrls: 0,
        totalClicks: 0,
        avgUrlsPerUser: 0,
        avgClicksPerUser: 0,
      }
    );
  } catch (error) {
    throw new Error("Analytics summary generation failed");
  }
};

// Indexes for performance optimization
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ urlCount: -1 });
userSchema.index({ totalClicks: -1 });
userSchema.index({ "apiUsage.lastRequestAt": -1 });

const User = mongoose.model("User", userSchema);

export default User;
