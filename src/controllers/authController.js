import authService from "../services/authService.js";
import { ApiResponse } from "../utils/responses.js";

/**
 * Authentication Controller for SnapURL
 * Handles HTTP requests for user authentication and account management
 */

/**
 * Register a new user account
 * @route POST /api/auth/register
 * @access Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const result = await authService.register({
      name,
      email,
      password,
    });

    res.status(201).json(
      ApiResponse.success(
        "User registered successfully",
        {
          user: result.user,
          token: result.token,
        },
        {
          expiresIn: result.expiresIn,
          tokenType: "Bearer",
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login({
      email,
      password,
    });

    res.status(200).json(
      ApiResponse.success(
        "Login successful",
        {
          user: result.user,
          token: result.token,
        },
        {
          expiresIn: result.expiresIn,
          tokenType: "Bearer",
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh authentication token
 * @route POST /api/auth/refresh
 * @access Private
 */
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json(ApiResponse.error("No token provided", null, 401));
    }

    const result = await authService.refreshToken(token);

    res.status(200).json(
      ApiResponse.success(
        "Token refreshed successfully",
        {
          user: result.user,
          token: result.token,
        },
        {
          expiresIn: result.expiresIn,
          tokenType: "Bearer",
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/profile
 * @access Private
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = req.user; // From auth middleware

    res
      .status(200)
      .json(
        ApiResponse.success("Profile retrieved successfully", {
          user: user.getPublicProfile(),
        })
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @route PUT /api/auth/profile
 * @access Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    const result = await authService.updateProfile(userId, updateData);

    res
      .status(200)
      .json(ApiResponse.success(result.message, { user: result.user }));
  } catch (error) {
    next(error);
  }
};

/**
 * Change user password
 * @route PUT /api/auth/change-password
 * @access Private
 */
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(userId, {
      currentPassword,
      newPassword,
    });

    res.status(200).json(ApiResponse.success(result.message));
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await authService.requestPasswordReset(email);

    res.status(200).json(
      ApiResponse.success(
        result.message,
        // In production, don't return the reset token
        process.env.NODE_ENV === "development"
          ? { resetToken: result.resetToken }
          : null
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 * @route POST /api/auth/reset-password
 * @access Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    const result = await authService.resetPassword(resetToken, newPassword);

    res.status(200).json(ApiResponse.success(result.message));
  } catch (error) {
    next(error);
  }
};

/**
 * Validate token (health check for token)
 * @route GET /api/auth/validate
 * @access Private
 */
export const validateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json(ApiResponse.error("No token provided", null, 401));
    }

    const result = await authService.validateToken(token);

    res.status(200).json(
      ApiResponse.success("Token is valid", {
        user: result.user,
        tokenData: result.tokenData,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's API usage statistics
 * @route GET /api/auth/usage
 * @access Private
 */
export const getApiUsage = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const usage = await authService.getApiUsage(userId);

    res
      .status(200)
      .json(ApiResponse.success("API usage retrieved successfully", { usage }));
  } catch (error) {
    next(error);
  }
};

/**
 * Generate API key for external integrations
 * @route POST /api/auth/api-key
 * @access Private
 */
export const generateApiKey = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { keyName } = req.body;

    const result = await authService.generateApiKey(userId, keyName);

    res.status(201).json(
      ApiResponse.success(
        "API key generated successfully",
        {
          apiKey: result.apiKey,
          keyName: result.keyName,
          expiresAt: result.expiresAt,
        },
        {
          warning: "Store this API key securely. It will not be shown again.",
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate user account
 * @route DELETE /api/auth/account
 * @access Private
 */
export const deactivateAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { reason } = req.body;

    const result = await authService.deactivateAccount(userId, reason);

    res.status(200).json(
      ApiResponse.success(result.message, {
        deactivatedAt: result.deactivatedAt,
        reason: result.reason,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (client-side token invalidation)
 * @route POST /api/auth/logout
 * @access Private
 */
export const logout = async (req, res, next) => {
  try {
    // In a stateless JWT setup, logout is handled client-side
    // In production, you might want to maintain a token blacklist

    res.status(200).json(
      ApiResponse.success("Logged out successfully", null, {
        instruction: "Please remove the token from client storage",
      })
    );
  } catch (error) {
    next(error);
  }
};
