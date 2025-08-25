import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import { ApiResponse } from "../utils/responses.js";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json(ApiResponse.error("No token, authorization denied", null, 401));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);

      // Get user from token
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res
          .status(401)
          .json(
            ApiResponse.error(
              "Token is valid but user no longer exists",
              null,
              401
            )
          );
      }

      req.user = user;
      next();
    } catch (error) {
      return res
        .status(401)
        .json(ApiResponse.error("Token is not valid", null, 401));
    }
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but that's ok for optional auth
        console.log("Optional auth: Invalid token");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
