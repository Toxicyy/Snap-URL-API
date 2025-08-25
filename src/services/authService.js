import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { config } from "../config/config.js";

/**
 * Authentication Service for SnapURL
 * Handles user registration, login, token management, and password operations
 */

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.name - User's full name
   * @param {string} userData.email - User's email address
   * @param {string} userData.password - User's password
   * @returns {Promise<Object>} Created user and authentication token
   * @throws {Error} If registration fails or email already exists
   */
  async register(userData) {
    try {
      const { name, email, password } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Create new user (password will be hashed by pre-save middleware)
      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
      });

      // Generate JWT token
      const token = user.generateToken();

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return {
        user: user.getPublicProfile(),
        token,
        expiresIn: config.jwtExpire,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Email already registered");
      }
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Authenticate user login
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User's email
   * @param {string} credentials.password - User's password
   * @returns {Promise<Object>} User data and authentication token
   * @throws {Error} If authentication fails
   */
  async login(credentials) {
    try {
      const { email, password } = credentials;

      // Find user and include password field
      const user = await User.findOne({
        email: email.toLowerCase(),
      }).select("+password");

      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Check if user account is active
      if (!user.isActive) {
        throw new Error(
          "Account has been deactivated. Please contact support."
        );
      }

      // Validate password
      const isPasswordValid = await user.matchPassword(password);
      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      // Update last login time
      user.lastLogin = new Date();
      user.apiUsage.lastRequestAt = new Date();
      await user.save();

      // Generate new token
      const token = user.generateToken();

      return {
        user: user.getPublicProfile(),
        token,
        expiresIn: config.jwtExpire,
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Refresh authentication token
   * @param {string} oldToken - Current JWT token
   * @returns {Promise<Object>} New token and user data
   * @throws {Error} If token refresh fails
   */
  async refreshToken(oldToken) {
    try {
      // Verify the old token
      const decoded = jwt.verify(oldToken, config.jwtSecret);

      // Find the user
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new Error("User not found or inactive");
      }

      // Generate new token
      const newToken = user.generateToken();

      // Update API usage tracking
      user.apiUsage.lastRequestAt = new Date();
      user.apiUsage.requestCount += 1;
      await user.save();

      return {
        user: user.getPublicProfile(),
        token: newToken,
        expiresIn: config.jwtExpire,
      };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token has expired. Please login again.");
      }
      if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid token. Please login again.");
      }
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {Object} passwordData - Password change data
   * @param {string} passwordData.currentPassword - Current password
   * @param {string} passwordData.newPassword - New password
   * @returns {Promise<Object>} Success confirmation
   * @throws {Error} If password change fails
   */
  async changePassword(userId, passwordData) {
    try {
      const { currentPassword, newPassword } = passwordData;

      // Find user with password
      const user = await User.findById(userId).select("+password");
      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await user.matchPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Validate new password strength
      if (newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters long");
      }

      // Update password (will be hashed by pre-save middleware)
      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  /**
   * Request password reset (generate reset token)
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Password reset instructions
   * @throws {Error} If user not found
   */
  async requestPasswordReset(email) {
    try {
      const user = await User.findOne({
        email: email.toLowerCase(),
        isActive: true,
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        return {
          success: true,
          message:
            "If an account with this email exists, password reset instructions have been sent.",
        };
      }

      // Generate reset token (valid for 1 hour)
      const resetToken = jwt.sign(
        {
          id: user._id,
          type: "password-reset",
        },
        config.jwtSecret,
        { expiresIn: "1h" }
      );

      // In a real application, you would send this token via email
      // For demo purposes, we'll return it
      return {
        success: true,
        message: "Password reset instructions sent to your email",
        resetToken, // In production, this would be sent via email
      };
    } catch (error) {
      throw new Error(`Password reset request failed: ${error.message}`);
    }
  }

  /**
   * Reset password using reset token
   * @param {string} resetToken - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success confirmation
   * @throws {Error} If reset fails
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Verify reset token
      const decoded = jwt.verify(resetToken, config.jwtSecret);

      if (decoded.type !== "password-reset") {
        throw new Error("Invalid reset token");
      }

      // Find user
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new Error("User not found or inactive");
      }

      // Validate new password
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: "Password has been reset successfully",
      };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error(
          "Reset token has expired. Please request a new password reset."
        );
      }
      if (error.name === "JsonWebTokenError") {
        throw new Error(
          "Invalid reset token. Please request a new password reset."
        );
      }
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  /**
   * Validate JWT token and return user data
   * @param {string} token - JWT token to validate
   * @returns {Promise<Object>} User data if token is valid
   * @throws {Error} If token is invalid or expired
   */
  async validateToken(token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);

      // Find user
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new Error("User not found or inactive");
      }

      return {
        user: user.getPublicProfile(),
        tokenData: {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          iat: decoded.iat,
          exp: decoded.exp,
        },
      };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token has expired");
      }
      if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid token");
      }
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Profile data to update
   * @returns {Promise<Object>} Updated user profile
   * @throws {Error} If update fails
   */
  async updateProfile(userId, updateData) {
    try {
      const allowedFields = ["name", "preferences"];
      const updates = {};

      // Filter allowed fields
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          updates[key] = updateData[key];
        }
      });

      const user = await User.findByIdAndUpdate(userId, updates, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        user: user.getPublicProfile(),
        message: "Profile updated successfully",
      };
    } catch (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  /**
   * Deactivate user account
   * @param {string} userId - User ID
   * @param {string} reason - Deactivation reason
   * @returns {Promise<Object>} Deactivation confirmation
   * @throws {Error} If deactivation fails
   */
  async deactivateAccount(userId, reason = "User requested") {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      user.isActive = false;
      await user.save();

      // In a real application, you might want to:
      // - Deactivate all user's URLs
      // - Send confirmation email
      // - Log the deactivation

      return {
        success: true,
        message: "Account has been deactivated",
        deactivatedAt: new Date(),
        reason,
      };
    } catch (error) {
      throw new Error(`Account deactivation failed: ${error.message}`);
    }
  }

  /**
   * Get user's API usage statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} API usage statistics
   * @throws {Error} If user not found
   */
  async getApiUsage(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      return {
        userId: user._id,
        requestCount: user.apiUsage.requestCount,
        lastRequestAt: user.apiUsage.lastRequestAt,
        rateLimitResets: user.apiUsage.rateLimitResets,
        accountAge: user.accountAge,
        totalUrls: user.urlCount,
        totalClicks: user.totalClicks,
        activityScore: user.activityScore,
      };
    } catch (error) {
      throw new Error(`API usage retrieval failed: ${error.message}`);
    }
  }

  /**
   * Generate API key for external integrations (future feature)
   * @param {string} userId - User ID
   * @param {string} keyName - Name for the API key
   * @returns {Promise<Object>} Generated API key
   * @throws {Error} If generation fails
   */
  async generateApiKey(userId, keyName = "Default") {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Generate API key using JWT with longer expiration
      const apiKey = jwt.sign(
        {
          id: user._id,
          type: "api-key",
          name: keyName,
        },
        config.jwtSecret,
        {
          expiresIn: "1y", // API keys expire after 1 year
          issuer: "snapurl-api",
          audience: "snapurl-external",
        }
      );

      return {
        apiKey,
        keyName,
        userId: user._id,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        createdAt: new Date(),
      };
    } catch (error) {
      throw new Error(`API key generation failed: ${error.message}`);
    }
  }
}

export default new AuthService();
