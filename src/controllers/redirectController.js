import urlService from "../services/urlService.js";
import analyticsService from "../services/analyticsService.js";
import { ApiResponse } from "../utils/responses.js";

/**
 * Redirect Controller for SnapURL
 * Handles HTTP requests for URL redirects and click tracking
 */

/**
 * Handle short URL redirect with analytics tracking
 * @route GET /:shortCode
 * @access Public
 */
export const handleRedirect = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    // Extract client information
    const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const userAgent = req.get("User-Agent") || null;
    const referrer = req.get("Referrer") || req.get("Referer") || null;

    // Get URL by short code
    const url = await urlService.getUrlByShortCode(shortCode);

    if (!url) {
      // Return a user-friendly 404 page or redirect to error page
      return res.status(404).json(
        ApiResponse.error(
          "Short URL not found or expired",
          {
            shortCode,
            suggestion: "Please check the URL and try again",
          },
          404
        )
      );
    }

    // Record the click asynchronously (don't block the redirect)
    const clickData = {
      urlId: url._id,
      ipAddress,
      userAgent,
      referrer,
      userId: null, // Anonymous click
      sessionId: req.sessionID || null,
    };

    // Record click without waiting (fire and forget)
    analyticsService.recordClick(clickData).catch((error) => {
      console.error("Click recording failed:", error);
      // Don't block redirect even if analytics fail
    });

    // Perform the redirect
    res.redirect(302, url.originalUrl);
  } catch (error) {
    // Even if there's an error, try to redirect if we have the original URL
    console.error("Redirect error:", error);

    // Return error response instead of redirect if we can't proceed
    res.status(500).json(
      ApiResponse.error(
        "Redirect failed",
        {
          shortCode: req.params.shortCode,
          error: error.message,
        },
        500
      )
    );
  }
};

/**
 * Get redirect preview (shows destination without redirecting)
 * @route GET /preview/:shortCode
 * @access Public
 */
export const getRedirectPreview = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    const url = await urlService.getUrlByShortCode(shortCode);

    if (!url) {
      return res
        .status(404)
        .json(ApiResponse.error("Short URL not found or expired", null, 404));
    }

    // Return preview information without redirecting
    res.status(200).json(
      ApiResponse.success("Redirect preview retrieved successfully", {
        shortCode,
        shortUrl: url.shortUrl,
        originalUrl: url.originalUrl,
        title: url.title || url.metadata?.pageTitle || "Untitled",
        description: url.description || url.metadata?.pageDescription || "",
        domain: url.metadata?.domain,
        favicon: url.metadata?.favicon,
        createdAt: url.createdAt,
        isActive: url.isActive,
        totalClicks: url.clickCount,
        qrCode: url.qrCode?.dataUrl,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Handle redirect with custom tracking parameters
 * @route GET /:shortCode/track
 * @access Public
 */
export const handleTrackedRedirect = async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      ref,
      track_id,
    } = req.query;

    // Extract client information
    const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const userAgent = req.get("User-Agent") || null;
    const referrer = ref || req.get("Referrer") || req.get("Referer") || null;

    // Get URL by short code
    const url = await urlService.getUrlByShortCode(shortCode);

    if (!url) {
      return res
        .status(404)
        .json(ApiResponse.error("Short URL not found or expired", null, 404));
    }

    // Enhanced click data with tracking parameters
    const clickData = {
      urlId: url._id,
      ipAddress,
      userAgent,
      referrer,
      userId: null,
      sessionId: req.sessionID || null,
      customData: {
        trackingId: track_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        trackingTimestamp: new Date(),
      },
    };

    // Record enhanced click data
    analyticsService.recordClick(clickData).catch((error) => {
      console.error("Enhanced click recording failed:", error);
    });

    // Build destination URL with preserved parameters
    let destinationUrl = url.originalUrl;

    // If destination URL already has query parameters, append; otherwise, add them
    const urlObj = new URL(destinationUrl);
    if (utm_source) urlObj.searchParams.set("utm_source", utm_source);
    if (utm_medium) urlObj.searchParams.set("utm_medium", utm_medium);
    if (utm_campaign) urlObj.searchParams.set("utm_campaign", utm_campaign);
    if (utm_term) urlObj.searchParams.set("utm_term", utm_term);
    if (utm_content) urlObj.searchParams.set("utm_content", utm_content);

    res.redirect(302, urlObj.toString());
  } catch (error) {
    console.error("Tracked redirect error:", error);
    res
      .status(500)
      .json(ApiResponse.error("Tracked redirect failed", null, 500));
  }
};

/**
 * Get redirect statistics for public URLs
 * @route GET /:shortCode/stats
 * @access Public (limited info)
 */
export const getPublicStats = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    const url = await urlService.getUrlByShortCode(shortCode);

    if (!url) {
      return res
        .status(404)
        .json(ApiResponse.error("Short URL not found or expired", null, 404));
    }

    // Return limited public statistics
    res.status(200).json(
      ApiResponse.success("Public statistics retrieved successfully", {
        shortCode,
        shortUrl: url.shortUrl,
        title: url.title || "Untitled",
        domain: url.metadata?.domain,
        createdAt: url.createdAt,
        totalClicks: url.clickCount,
        // Don't expose detailed analytics for public URLs
        isActive: url.isActive,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Handle QR code redirect (same as regular redirect but with QR tracking)
 * @route GET /qr/:shortCode
 * @access Public
 */
export const handleQRRedirect = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    // Extract client information
    const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const userAgent = req.get("User-Agent") || null;
    const referrer = req.get("Referrer") || req.get("Referer") || null;

    // Get URL by short code
    const url = await urlService.getUrlByShortCode(shortCode);

    if (!url) {
      return res
        .status(404)
        .json(
          ApiResponse.error("QR code target not found or expired", null, 404)
        );
    }

    // Record click with QR code source tracking
    const clickData = {
      urlId: url._id,
      ipAddress,
      userAgent,
      referrer,
      userId: null,
      customData: {
        source: "qr_code",
        qrScanTimestamp: new Date(),
      },
    };

    analyticsService.recordClick(clickData).catch((error) => {
      console.error("QR click recording failed:", error);
    });

    // Redirect to original URL
    res.redirect(302, url.originalUrl);
  } catch (error) {
    console.error("QR redirect error:", error);
    res.status(500).json(ApiResponse.error("QR redirect failed", null, 500));
  }
};

/**
 * Batch redirect validation (check multiple short codes)
 * @route POST /validate-batch
 * @access Public
 */
export const validateBatchRedirects = async (req, res, next) => {
  try {
    const { shortCodes } = req.body;

    if (!Array.isArray(shortCodes)) {
      return res
        .status(400)
        .json(ApiResponse.error("Short codes array is required", null, 400));
    }

    if (shortCodes.length > 50) {
      return res
        .status(400)
        .json(
          ApiResponse.error(
            "Maximum 50 short codes allowed per batch",
            null,
            400
          )
        );
    }

    // Validate each short code
    const validationPromises = shortCodes.map(async (shortCode) => {
      try {
        const url = await urlService.getUrlByShortCode(shortCode);
        return {
          shortCode,
          valid: !!url,
          active: url ? url.isActive : false,
          expired: url ? url.isExpired : true,
          destination: url ? url.originalUrl : null,
        };
      } catch (error) {
        return {
          shortCode,
          valid: false,
          error: error.message,
        };
      }
    });

    const results = await Promise.all(validationPromises);

    const summary = {
      total: shortCodes.length,
      valid: results.filter((r) => r.valid).length,
      invalid: results.filter((r) => !r.valid).length,
      active: results.filter((r) => r.valid && r.active).length,
      expired: results.filter((r) => r.valid && r.expired).length,
    };

    res.status(200).json(
      ApiResponse.success("Batch validation completed", {
        results,
        summary,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Handle redirect with password protection (future feature)
 * @route POST /:shortCode/unlock
 * @access Public
 */
export const handlePasswordProtectedRedirect = async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json(ApiResponse.error("Password is required", null, 400));
    }

    const url = await urlService.getUrlByShortCode(shortCode);

    if (!url) {
      return res
        .status(404)
        .json(ApiResponse.error("Short URL not found or expired", null, 404));
    }

    // Check if URL has password protection
    if (!url.password) {
      // If no password set, redirect normally
      return res.redirect(302, url.originalUrl);
    }

    // Verify password (in production, this would be hashed)
    const bcrypt = await import("bcryptjs");
    const isValidPassword = await bcrypt.compare(password, url.password);

    if (!isValidPassword) {
      return res
        .status(401)
        .json(ApiResponse.error("Invalid password", null, 401));
    }

    // Record click with password unlock tracking
    const clickData = {
      urlId: url._id,
      ipAddress: req.ip || "127.0.0.1",
      userAgent: req.get("User-Agent"),
      referrer: req.get("Referrer"),
      customData: {
        passwordProtected: true,
        unlockedAt: new Date(),
      },
    };

    analyticsService.recordClick(clickData).catch(console.error);

    res.status(200).json(
      ApiResponse.success("URL unlocked successfully", {
        redirectUrl: url.originalUrl,
      })
    );
  } catch (error) {
    next(error);
  }
};
