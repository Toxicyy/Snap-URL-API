import urlService from "../services/urlService.js";
import { ApiResponse } from "../utils/responses.js";

/**
 * URL Controller for SnapURL
 * Handles HTTP requests for URL shortening, management, and QR code generation
 */

/**
 * Create a new shortened URL
 * @route POST /api/urls
 * @access Private/Public (depending on settings)
 */
export const createUrl = async (req, res, next) => {
  try {
    

    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        debug: {
          bodyType: typeof req.body,
          bodyValue: req.body,
          contentType: req.get("Content-Type"),
        },
      });
    }

    const {
      originalUrl,
      customAlias,
      title,
      description,
      generateQR = true,
      fetchMetadata = true,
      tags,
      expiresIn,
    } = req.body;

    const userId = req.user?._id || null; // Optional authentication

    const result = await urlService.createUrl(
      {
        originalUrl,
        customAlias,
        title,
        description,
        userId,
        tags
      },
      {
        generateQR,
        fetchMetadata,
        expiresIn,
      }
    );

    const statusCode = result.isNew ? 201 : 200;
    const message = result.isNew
      ? "URL shortened successfully"
      : result.message;

    res.status(statusCode).json(
      ApiResponse.success(
        message,
        {
          url: result.url,
          shortUrl: result.shortUrl,
        },
        {
          isNew: result.isNew,
          qrCodePending: result.qrCodePending,
          metadataPending: result.metadataPending,
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all URLs for the authenticated user
 * @route GET /api/urls
 * @access Private
 */
export const getUserUrls = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      search = "",
      isActive,
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      search,
      isActive: isActive !== undefined ? isActive === "true" : null,
    };

    const result = await urlService.getUserUrls(userId, options);

    res
      .status(200)
      .json(
        ApiResponse.paginated(
          "URLs retrieved successfully",
          result.urls,
          result.pagination
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific URL by ID
 * @route GET /api/urls/:id
 * @access Private
 */
export const getUrlById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Get URL stats (includes authorization check)
    const result = await urlService.getUrlStats(id, userId);

    res
      .status(200)
      .json(ApiResponse.success("URL retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

/**
 * Update URL properties
 * @route PUT /api/urls/:id
 * @access Private
 */
export const updateUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    const result = await urlService.updateUrl(id, userId, updateData);

    res
      .status(200)
      .json(ApiResponse.success(result.message, { url: result.url }));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete/deactivate URL
 * @route DELETE /api/urls/:id
 * @access Private
 */
export const deleteUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { hardDelete = false } = req.query;

    const result = await urlService.deleteUrl(
      id,
      userId,
      hardDelete === "true"
    );

    res.status(200).json(ApiResponse.success(result.message));
  } catch (error) {
    next(error);
  }
};

/**
 * Generate QR code for URL
 * @route POST /api/urls/:id/qr
 * @access Private
 */
export const generateQRCode = async (req, res, next) => {
  try {
    const { id: urlId } = req.params;
    const userId = req.user._id;

    // Extract QR options from request body
    const {
      size = 256,
      format = 'png',
      errorCorrectionLevel = 'M',
      margin = 4,
      color = { dark: '#000000', light: '#FFFFFF' }
    } = req.body;

    const options = {
      userId,
      size: parseInt(size),
      format,
      errorCorrectionLevel,
      margin: parseInt(margin),
      color
    };

    // Generate QR code
    const result = await urlService.generateQRCode(urlId, options);

    res.status(200).json(
      ApiResponse.success(
        'QR code generated successfully',
        result
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Search URLs
 * @route GET /api/urls/search
 * @access Private
 */
export const searchUrls = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { q: query, page = 1, limit = 10, sortBy = "relevance" } = req.query;

    if (!query || query.trim() === "") {
      return res
        .status(400)
        .json(ApiResponse.error("Search query is required", null, 400));
    }

    const options = {
      search: query.trim(),
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: sortBy === "relevance" ? "createdAt" : sortBy,
      sortOrder: "desc",
    };

    const result = await urlService.getUserUrls(userId, options);

    res
      .status(200)
      .json(
        ApiResponse.paginated(
          `Search results for "${query}"`,
          result.urls,
          result.pagination
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Get popular URLs
 * @route GET /api/urls/popular
 * @access Private
 */
export const getPopularUrls = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 10, days = 7, minClicks = 1 } = req.query;

    const options = {
      limit: parseInt(limit),
      days: parseInt(days),
      userId,
      minClicks: parseInt(minClicks),
    };

    const urls = await urlService.getPopularUrls(options);

    res.status(200).json(
      ApiResponse.success(
        "Popular URLs retrieved successfully",
        { urls },
        {
          criteria: {
            days: options.days,
            minClicks: options.minClicks,
          },
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk create URLs endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const bulkCreateUrls = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      urls,
      generateQR = false,
      fetchMetadata = false,
      skipDuplicates = true,
    } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res
        .status(400)
        .json(
          ApiResponse.error(
            "URLs array is required and cannot be empty",
            null,
            400
          )
        );
    }

    if (urls.length > 100) {
      return res
        .status(400)
        .json(
          ApiResponse.error(
            "Maximum 100 URLs allowed per bulk operation",
            null,
            400
          )
        );
    }

    const options = {
      generateQR,
      fetchMetadata,
      skipDuplicates,
      stopOnError: false,
    };

    const result = await urlService.bulkCreateUrls(urls, userId, options);

    // Adapt service result to expected frontend format
    const adaptedResult = {
      created: result.successful || [],
      skipped: result.skipped || [],
      errors: result.failed || [],
      
      summary: {
        total: result.totalProcessed || 0,
        created: result.successCount || 0,
        skipped: result.skippedCount || 0,
        errors: result.errorCount || 0,
      },
      
      results: [
        ...(result.successful || []).map(item => ({ ...item, status: 'created' })),
        ...(result.skipped || []).map(item => ({ ...item, status: 'skipped' })),
        ...(result.failed || []).map(item => ({ ...item, status: 'error' }))
      ]
    };

    res.status(200).json(
      ApiResponse.success("Bulk URL creation completed", adaptedResult, {
        summary: adaptedResult.summary,
      })
    );
  } catch (error) {
    console.error("Bulk create error:", error);
    next(error);
  }
};

/**
 * Export user URLs
 * @route GET /api/urls/export
 * @access Private
 */
export const exportUrls = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      format = "json",
      includeAnalytics = "true",
      includeInactive = "false",
      startDate,
      endDate,
    } = req.query;

    const options = {
      format,
      includeAnalytics: includeAnalytics === "true",
      includeInactive: includeInactive === "true",
      dateRange:
        startDate && endDate ? { start: startDate, end: endDate } : null,
    };

    const result = await urlService.exportUserUrls(userId, options);

    // Set appropriate headers for download
    res.set({
      "Content-Type": format === "json" ? "application/json" : "text/csv",
      "Content-Disposition": `attachment; filename=snapurl-export-${Date.now()}.${format}`,
    });

    if (format === "json") {
      res.status(200).json(result);
    } else {
      // For CSV format, you would convert the data to CSV here
      // For now, return JSON with a note
      res.status(200).json({
        ...result,
        note: "CSV format conversion would be implemented here",
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get URL preview (without authentication for public URLs)
 * @route GET /api/urls/preview/:shortCode
 * @access Public
 */
export const getUrlPreview = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    const url = await urlService.getUrlByShortCode(shortCode, false);

    if (!url) {
      return res
        .status(404)
        .json(ApiResponse.error("URL not found or expired", null, 404));
    }

    // Return basic info for preview (don't increment clicks)
    res.status(200).json(
      ApiResponse.success("URL preview retrieved", {
        originalUrl: URL_MODEL.originalUrl,
        title: URL_MODEL.title || URL_MODEL.metadata?.pageTitle || "Untitled",
        description:
          URL_MODEL.description || URL_MODEL.metadata?.pageDescription || "",
        domain: URL_MODEL.metadata?.domain || "Unknown",
        favicon: URL_MODEL.metadata?.favicon,
        createdAt: URL_MODEL.createdAt,
        qrCode: URL_MODEL.qrCode?.dataUrl,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get URL statistics (detailed analytics)
 * @route GET /api/urls/:id/stats
 * @access Private
 */
export const getUrlStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await urlService.getUrlStats(id, userId);

    res
      .status(200)
      .json(
        ApiResponse.success("URL statistics retrieved successfully", result)
      );
  } catch (error) {
    next(error);
  }
};
