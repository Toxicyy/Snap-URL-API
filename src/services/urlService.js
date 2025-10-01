import URL_MODEL from "../models/URL.js";
import User from "../models/User.js";
import {
  generateShortCode,
  validateShortCode,
} from "../utils/shortCodeGenerator.js";
import {
  generateQRCode as generateQRCodeUtil,
  validateUrlForQR,
} from "../utils/qrGenerator.js";
import { config } from "../config/config.js";
// Import Node.js URL explicitly
import { URL as NodeURL } from "url";

/**
 * URL Service for SnapURL
 * Handles URL creation, management, metadata fetching, and QR code generation
 */

class UrlService {
  /**
   * Create a new shortened URL
   * @param {Object} urlData - URL creation data
   * @param {string} urlData.originalUrl - The original long URL
   * @param {string} [urlData.customAlias] - Custom alias for the short URL
   * @param {string} [urlData.title] - User-defined title
   * @param {string} [urlData.description] - URL description
   * @param {string} [urlData.userId] - Owner user ID (optional for anonymous URLs)
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Created URL with short code and analytics
   * @throws {Error} If URL creation fails
   */
  async createUrl(urlData, options = {}) {
    try {
      const {
        originalUrl,
        customAlias,
        title,
        description,
        userId,
        tags,
        generateQR = true,
        fetchMetadata = true,
        expiresIn = null, // days
      } = { ...urlData, ...options };

      // Validate original URL
      if (!this._isValidUrl(originalUrl)) {
        throw new Error(
          "Invalid URL format. URL must start with http:// or https://"
        );
      }

      // Check URL length
      if (originalUrl.length > config.maxUrlLength) {
        throw new Error(
          `URL too long. Maximum length is ${config.maxUrlLength} characters`
        );
      }

      // Check URL limit for authenticated users
      if (userId) {
        const userUrlCount = await URL_MODEL.countDocuments({
          userId,
          isActive: true,
        });

        if (userUrlCount >= 20) {
          throw new Error(
            "URL limit reached. You can create up to 20 shortened URLs. Please delete some existing URLs to create new ones, or contact support for a premium account with higher limits."
          );
        }
      }

      // Check for existing URL by the same user to prevent duplicates
      if (userId) {
        try {
          const existingUrl = await URL_MODEL.findOne({
            originalUrl,
            userId,
            isActive: true,
          });

          if (existingUrl) {
            // Return existing URL instead of creating duplicate
            return {
              url: existingUrl,
              isNew: false,
              message: "URL already exists in your account",
            };
          }
        } catch (error) {
          console.log("Error checking for existing URL:", error.message);
          // Continue with creation if check fails
        }
      }

      // Validate custom alias if provided
      let finalShortCode;
      if (customAlias) {
        if (!config.allowCustomAlias) {
          throw new Error("Custom aliases are not allowed on this instance");
        }

        const validation = validateShortCode(customAlias);
        if (!validation.isValid) {
          throw new Error(
            `Invalid custom alias: ${validation.errors.join(", ")}`
          );
        }

        // Check if custom alias is available
        const existingAlias = await URL_MODEL.findOne({
          $or: [{ shortCode: customAlias }, { customAlias: customAlias }],
        });

        if (existingAlias) {
          throw new Error("Custom alias is already taken");
        }

        finalShortCode = customAlias;
      } else {
        // Generate unique short code
        finalShortCode = await this._generateUniqueShortCode();
      }

      // Calculate expiration date if specified
      let expiresAt = null;
      if (expiresIn) {
        expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
      }

      // Create URL document
      const urlDoc = new URL_MODEL({
        originalUrl,
        shortCode: finalShortCode,
        title: title?.trim() || null,
        description: description?.trim() || null,
        tags: tags?.map((tag) => tag.trim()) || [],
        userId: userId || null,
        expiresAt,
      });

      if (customAlias && customAlias.trim()) {
        urlDoc.customAlias = customAlias.trim();
      }

      // Save URL
      await urlDoc.save();

      // Update user statistics if user is authenticated
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          $inc: { urlCount: 1 },
        });
      }

      return {
        url: urlDoc,
        isNew: true,
        shortUrl: urlDoc.shortUrl,
        qrCodePending: generateQR,
        metadataPending: fetchMetadata,
      };
    } catch (error) {
      throw new Error(`URL creation failed: ${error.message}`);
    }
  }

  /**
   * Get URL by short code or custom alias
   * @param {string} shortCode - Short code or custom alias
   * @param {boolean} [incrementView=false] - Whether to increment view count
   * @returns {Promise<Object|null>} URL document or null if not found
   * @throws {Error} If retrieval fails
   */
  async getUrlByShortCode(shortCode, incrementView = false) {
    try {
      const url = await URL_MODEL.findOne({
        $or: [{ shortCode }, { customAlias: shortCode }],
        isActive: true,
      }).populate("userId", "name email");

      if (!url) {
        return null;
      }

      // Check if URL is expired
      if (url.isExpired) {
        return null;
      }

      // Increment view count if requested (for analytics preview)
      if (incrementView) {
        url.clickCount += 1;
        await url.save();
      }

      return url;
    } catch (error) {
      throw new Error(`URL retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get URL by ID
   * @param {string} urlId - URL ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise<Object|null>} URL document or null
   * @throws {Error} If retrieval fails
   */
  async getUrlById(urlId, userId = null) {
    try {
      const query = { _id: urlId };
      if (userId) {
        query.userId = userId;
      }

      const url = await URL_MODEL.findOne(query).populate(
        "userId",
        "name email"
      );
      return url;
    } catch (error) {
      throw new Error(`URL retrieval failed: ${error.message}`);
    }
  }

  /**
   * Update URL
   * @param {string} urlId - URL ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated URL
   * @throws {Error} If update fails
   */
  async updateUrl(urlId, userId, updateData) {
    try {
      const url = await URL_MODEL.findOneAndUpdate(
        { _id: urlId, userId },
        updateData,
        { new: true }
      );

      if (!url) {
        throw new Error(
          "URL not found or you don't have permission to update it"
        );
      }

      return url;
    } catch (error) {
      throw new Error(`URL update failed: ${error.message}`);
    }
  }

  /**
   * Delete URL
   * @param {string} urlId - URL ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If deletion fails
   */
  async deleteUrl(urlId, userId) {
    try {
      const url = await URL_MODEL.findOneAndDelete({ _id: urlId, userId });

      if (!url) {
        throw new Error(
          "URL not found or you don't have permission to delete it"
        );
      }

      // Update user statistics
      await User.findByIdAndUpdate(userId, {
        $inc: { urlCount: -1 },
      });

      return true;
    } catch (error) {
      throw new Error(`URL deletion failed: ${error.message}`);
    }
  }

  /**
   * Get user URLs with search and pagination
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} URLs with pagination info
   * @throws {Error} If retrieval fails
   */
  async getUserUrls(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search = "",
        isActive = null,
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

      // Build query
      const query = { userId };

      if (isActive !== null) {
        query.isActive = isActive;
      }

      // Add search functionality
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { originalUrl: { $regex: search, $options: "i" } },
          { shortCode: { $regex: search, $options: "i" } },
          { customAlias: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { "metadata.pageTitle": { $regex: search, $options: "i" } },
        ];
      }

      // Get total count
      const totalUrls = await URL_MODEL.countDocuments(query);

      // Get URLs
      const urls = await URL_MODEL.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      return {
        urls,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUrls / limit),
          totalUrls,
          hasNextPage: page < Math.ceil(totalUrls / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`User URLs retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get popular URLs (most clicked)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Popular URLs
   * @throws {Error} If retrieval fails
   */
  async getPopularUrls(options = {}) {
    try {
      const { userId = null, limit = 10, days = 30, minClicks = 1 } = options;

      // Build query
      const query = {
        isActive: true,
        clickCount: { $gte: minClicks },
      };

      // Filter by user if provided
      if (userId) {
        query.userId = userId;
      }

      // Filter by date if days specified
      if (days) {
        const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: dateThreshold };
      }

      const urls = await URL_MODEL.find(query)
        .sort({ clickCount: -1, createdAt: -1 })
        .limit(limit)
        .populate("userId", "name")
        .lean();

      return urls;
    } catch (error) {
      throw new Error(`Popular URLs retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get recent URLs
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Recent URLs
   * @throws {Error} If retrieval fails
   */
  async getRecentUrls(options = {}) {
    try {
      const { userId = null, limit = 10, isActive = true } = options;

      const query = {};

      if (userId) {
        query.userId = userId;
      }

      if (isActive !== null) {
        query.isActive = isActive;
      }

      const urls = await URL_MODEL.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("userId", "name")
        .lean();

      return urls;
    } catch (error) {
      throw new Error(`Recent URLs retrieval failed: ${error.message}`);
    }
  }

  /**
   * Bulk delete URLs
   * @param {Array} urlIds - Array of URL IDs
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   * @throws {Error} If bulk deletion fails
   */
  async bulkDeleteUrls(urlIds, userId) {
    try {
      if (!Array.isArray(urlIds) || urlIds.length === 0) {
        throw new Error("URL IDs array is required");
      }

      const result = await URL_MODEL.deleteMany({
        _id: { $in: urlIds },
        userId,
      });

      // Update user statistics
      if (result.deletedCount > 0) {
        await User.findByIdAndUpdate(userId, {
          $inc: { urlCount: -result.deletedCount },
        });
      }

      return {
        deletedCount: result.deletedCount,
        requestedCount: urlIds.length,
        success: result.deletedCount > 0,
      };
    } catch (error) {
      throw new Error(`Bulk deletion failed: ${error.message}`);
    }
  }

  /**
   * Toggle URL active status
   * @param {string} urlId - URL ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated URL
   * @throws {Error} If toggle fails
   */
  async toggleUrlStatus(urlId, userId) {
    try {
      const url = await URL_MODEL.findOne({ _id: urlId, userId });

      if (!url) {
        throw new Error("URL not found or you don't have permission");
      }

      url.isActive = !url.isActive;
      await url.save();

      return url;
    } catch (error) {
      throw new Error(`Toggle URL status failed: ${error.message}`);
    }
  }

  /**
   * Get URL statistics
   * @param {string} urlId - URL ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} URL statistics
   * @throws {Error} If statistics retrieval fails
   */
  async getUrlStats(urlId, userId = null) {
    try {
      const query = { _id: urlId };
      if (userId) {
        query.userId = userId;
      }

      const url = await URL_MODEL.findOne(query);

      if (!url) {
        throw new Error("URL not found");
      }

      return {
        id: url._id,
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        title: url.title,
        clickCount: url.clickCount || 0,
        uniqueClicks: url.uniqueClicks || 0,
        createdAt: url.createdAt,
        lastClickedAt: url.lastClickedAt,
        isActive: url.isActive,
        isExpired: url.isExpired,
      };
    } catch (error) {
      throw new Error(`URL statistics retrieval failed: ${error.message}`);
    }
  }

  /**
   * Check if custom alias is available
   * @param {string} alias - Custom alias to check
   * @returns {Promise<boolean>} Availability status
   * @throws {Error} If check fails
   */
  async isAliasAvailable(alias) {
    try {
      const validation = validateShortCode(alias);
      if (!validation.isValid) {
        throw new Error(`Invalid alias: ${validation.errors.join(", ")}`);
      }

      const existingUrl = await URL_MODEL.findOne({
        $or: [{ shortCode: alias }, { customAlias: alias }],
      });

      return !existingUrl;
    } catch (error) {
      throw new Error(`Alias availability check failed: ${error.message}`);
    }
  }

  /**
   * Private method to generate unique short code
   * @returns {Promise<string>} Unique short code
   * @throws {Error} If cannot generate unique code
   */
  async _generateUniqueShortCode() {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const shortCode = generateShortCode();

      // Check if generated code is valid
      if (!shortCode || shortCode.trim() === "") {
        console.log("Generated empty short code, trying again...");
        attempts++;
        continue;
      }

      // Check if code exists
      const existingUrl = await URL_MODEL.findOne({
        $or: [{ shortCode }, { customAlias: shortCode }],
      });

      if (!existingUrl) {
        return shortCode;
      }

      attempts++;
    }

    throw new Error(
      "Unable to generate unique short code after multiple attempts"
    );
  }

  /**
   * Bulk create URLs with duplicate detection and error handling
   * @param {Array} urlsData - Array of URL data objects containing originalUrl, title, description
   * @param {string} userId - User ID for ownership
   * @param {Object} options - Bulk creation options
   * @param {boolean} options.generateQR - Whether to generate QR codes
   * @param {boolean} options.fetchMetadata - Whether to fetch URL metadata
   * @param {boolean} options.skipDuplicates - Whether to skip duplicate URLs
   * @param {boolean} options.stopOnError - Whether to stop processing on first error
   * @returns {Promise<Object>} Bulk creation results with successful, failed, and skipped arrays
   * @throws {Error} If bulk creation fails or validation errors occur
   */
  async bulkCreateUrls(urlsData, userId, options = {}) {
    try {
      if (!Array.isArray(urlsData) || urlsData.length === 0) {
        throw new Error("URLs data array is required");
      }

      if (urlsData.length > 100) {
        throw new Error("Maximum 100 URLs allowed per bulk request");
      }

      const {
        generateQR = false,
        fetchMetadata = false,
        skipDuplicates = true,
        stopOnError = false,
      } = options;

      const results = {
        successful: [],
        failed: [],
        skipped: [],
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
        skippedCount: 0,
      };

      for (let i = 0; i < urlsData.length; i++) {
        const urlData = urlsData[i];
        results.totalProcessed++;

        try {
          if (skipDuplicates) {
            const existingUrl = await URL_MODEL.findOne({
              originalUrl: urlData.originalUrl,
              userId: userId,
            });

            if (existingUrl) {
              results.skipped.push({
                index: i,
                originalUrl: urlData.originalUrl,
                shortUrl: existingUrl.shortUrl,
                shortCode: existingUrl.shortCode,
                title: existingUrl.title,
                description: existingUrl.description,
                reason: "duplicate",
                message: "URL already exists",
              });
              results.skippedCount++;
              continue;
            }
          }

          // Prepare URL data with user ID
          const urlWithUser = {
            ...urlData,
            userId,
          };
          const result = await this.createUrl(urlWithUser, {
            generateQR,
            fetchMetadata,
          });

          results.successful.push({
            index: i,
            originalUrl: urlData.originalUrl,
            shortUrl: result.url.shortUrl,
            shortCode: result.url.shortCode,
            title: result.url.title,
            description: result.url.description,
            isNew: result.isNew,
            message: result.message || "URL created successfully",
          });

          results.successCount++;
        } catch (error) {
          console.error(`Error creating URL ${i + 1}:`, error.message);

          results.failed.push({
            index: i,
            originalUrl: urlData.originalUrl,
            error: error.message,
          });

          results.errorCount++;

          // Stop processing if stopOnError is enabled
          if (stopOnError) {
            break;
          }
        }
      }

      // Update user URL count for successfully created URLs
      if (results.successCount > 0) {
        await User.findByIdAndUpdate(userId, {
          $inc: { urlCount: results.successCount },
        });
      }

      return results;
    } catch (error) {
      console.error("Bulk URL creation failed:", error);
      throw new Error(`Bulk URL creation failed: ${error.message}`);
    }
  }

  /**
   * Bulk update URLs
   * @param {Array} updates - Array of update objects with id and data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Bulk update results
   * @throws {Error} If bulk update fails
   */
  async bulkUpdateUrls(updates, userId) {
    try {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new Error("Updates array is required");
      }

      if (updates.length > 50) {
        throw new Error("Maximum 50 URLs allowed per bulk update request");
      }

      const results = {
        successful: [],
        failed: [],
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
      };

      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        results.totalProcessed++;

        try {
          if (!update.id) {
            throw new Error("URL ID is required");
          }

          const updatedUrl = await this.updateUrl(
            update.id,
            userId,
            update.data
          );

          results.successful.push({
            index: i,
            id: update.id,
            shortCode: updatedUrl.shortCode,
            message: "URL updated successfully",
          });

          results.successCount++;
        } catch (error) {
          results.failed.push({
            index: i,
            id: update.id,
            error: error.message,
          });

          results.errorCount++;
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Bulk URL update failed: ${error.message}`);
    }
  }

  /**
   * Get URL analytics summary
   * @param {string} urlId - URL ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Analytics summary
   * @throws {Error} If retrieval fails
   */
  async getUrlAnalyticsSummary(urlId, userId = null) {
    try {
      const query = { _id: urlId };
      if (userId) {
        query.userId = userId;
      }

      const url = await URL_MODEL.findOne(query);

      if (!url) {
        throw new Error("URL not found");
      }

      return {
        url: {
          id: url._id,
          shortCode: url.shortCode,
          originalUrl: url.originalUrl,
          title: url.title,
          isActive: url.isActive,
        },
        statistics: {
          totalClicks: url.clickCount || 0,
          uniqueClicks: url.uniqueClicks || 0,
          createdAt: url.createdAt,
          lastClickedAt: url.lastClickedAt,
          isExpired: url.isExpired,
          daysSinceCreation: Math.floor(
            (Date.now() - url.createdAt) / (1000 * 60 * 60 * 24)
          ),
        },
      };
    } catch (error) {
      throw new Error(`URL analytics summary failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code for URL
   * @param {string} urlId - URL ID
   * @param {Object} options - QR code options (может содержать userId)
   * @returns {Promise<Object>} QR code data
   * @throws {Error} If QR generation fails
   */
  async generateQRCode(urlId, options = {}) {
    try {
      const { userId, ...qrOptions } = options;

      const query = { _id: urlId };
      if (userId) {
        query.userId = userId;
      }

      // Get URL document
      const url = await URL_MODEL.findOne(query);

      if (!url) {
        throw new Error(
          "URL not found" +
            (userId ? " or you don't have permission to access it" : "")
        );
      }

      // Validate URL for QR code generation
      const shortUrl = url.shortUrl || `${config.baseUrl}/${url.shortCode}`;
      const urlValidation = validateUrlForQR(shortUrl);

      if (!urlValidation.isValid) {
        throw new Error(
          `URL validation failed: ${urlValidation.errors.join(", ")}`
        );
      }

      // Check if URL is active and not expired
      if (!url.isActive) {
        throw new Error("Cannot generate QR code for inactive URL");
      }

      if (url.isExpired) {
        throw new Error("Cannot generate QR code for expired URL");
      }

      const {
        size = 256,
        format = "png",
        errorCorrectionLevel = "M",
        margin = 4,
        color = {
          dark: "#000000",
          light: "#FFFFFF",
        },
      } = qrOptions;

      // Validate QR options
      if (size < 64 || size > 2048) {
        throw new Error("QR code size must be between 64 and 2048 pixels");
      }

      if (!["png", "jpeg", "svg"].includes(format.toLowerCase())) {
        throw new Error("QR code format must be png, jpeg, or svg");
      }

      if (!["L", "M", "Q", "H"].includes(errorCorrectionLevel)) {
        throw new Error("Error correction level must be L, M, Q, or H");
      }

      // Generate QR code using utility function
      const qrCode = await generateQRCodeUtil(shortUrl, {
        width: size,
        height: size,
        format: format.toLowerCase(),
        errorCorrectionLevel,
        margin,
        color,
      });

      // Update URL document with QR code info
      await URL_MODEL.findByIdAndUpdate(urlId, {
        "qrCode.generated": true,
        "qrCode.generatedAt": new Date(),
        "qrCode.format": format.toLowerCase(),
        "qrCode.size": size,
        "qrCode.errorCorrectionLevel": errorCorrectionLevel,
      });

      return {
        url: {
          id: url._id,
          shortCode: url.shortCode,
          shortUrl: shortUrl,
          originalUrl: url.originalUrl,
          title: url.title,
        },
        qrCode: {
          data: qrCode.data,
          dataURL: qrCode.dataURL,
          format: format.toLowerCase(),
          size,
          generatedAt: new Date(),
          errorCorrectionLevel,
          margin,
        },
        validation: {
          urlValid: urlValidation.isValid,
          warnings: urlValidation.warnings || [],
        },
      };
    } catch (error) {
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Get existing QR code for URL
   * @param {string} urlId - URL ID
   * @param {Object} options - Options (может содержать userId)
   * @returns {Promise<Object|null>} QR code data or null
   * @throws {Error} If retrieval fails
   */
  async getQRCode(urlId, options = {}) {
    try {
      const { userId } = options;

      const query = { _id: urlId };
      if (userId) {
        query.userId = userId;
      }

      const url = await URL_MODEL.findOne(query);

      if (!url) {
        throw new Error(
          "URL not found" +
            (userId ? " or you don't have permission to access it" : "")
        );
      }

      // Check if QR code exists
      if (!url.qrCode || !url.qrCode.generated) {
        return null;
      }

      // Regenerate QR code (as we might not store the actual image data)
      const qrCode = await generateQRCode(
        url.shortUrl || `${config.baseUrl}/${url.shortCode}`,
        {
          width: url.qrCode.size || 256,
          height: url.qrCode.size || 256,
          format: url.qrCode.format || "png",
        }
      );

      return {
        url: {
          id: url._id,
          shortCode: url.shortCode,
          shortUrl: url.shortUrl || `${config.baseUrl}/${url.shortCode}`,
        },
        qrCode: {
          data: qrCode.data,
          dataURL: qrCode.dataURL,
          format: url.qrCode.format || "png",
          size: url.qrCode.size || 256,
          generatedAt: url.qrCode.generatedAt,
        },
      };
    } catch (error) {
      throw new Error(`QR code retrieval failed: ${error.message}`);
    }
  }

  /**
   * Delete QR code for URL
   * @param {string} urlId - URL ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If deletion fails
   */
  async deleteQRCode(urlId, userId) {
    try {
      const result = await URL_MODEL.findOneAndUpdate(
        { _id: urlId, userId },
        {
          $unset: {
            "qrCode.generated": 1,
            "qrCode.generatedAt": 1,
            "qrCode.format": 1,
            "qrCode.size": 1,
          },
        }
      );

      if (!result) {
        throw new Error(
          "URL not found or you don't have permission to access it"
        );
      }

      return true;
    } catch (error) {
      throw new Error(`QR code deletion failed: ${error.message}`);
    }
  }

  /**
   * Generate multiple QR codes for URLs
   * @param {Array} urlIds - Array of URL IDs
   * @param {string} userId - User ID
   * @param {Object} options - QR code options
   * @returns {Promise<Object>} Bulk QR generation results
   * @throws {Error} If bulk generation fails
   */
  async bulkGenerateQRCodes(urlIds, userId, options = {}) {
    try {
      if (!Array.isArray(urlIds) || urlIds.length === 0) {
        throw new Error("URL IDs array is required");
      }

      if (urlIds.length > 50) {
        throw new Error(
          "Maximum 50 URLs allowed per bulk QR generation request"
        );
      }

      const results = {
        successful: [],
        failed: [],
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
      };

      for (let i = 0; i < urlIds.length; i++) {
        const urlId = urlIds[i];
        results.totalProcessed++;

        try {
          const qrResult = await this.generateQRCode(urlId, userId, options);

          results.successful.push({
            urlId,
            shortCode: qrResult.url.shortCode,
            qrGenerated: true,
            generatedAt: qrResult.qrCode.generatedAt,
          });

          results.successCount++;
        } catch (error) {
          results.failed.push({
            urlId,
            error: error.message,
          });

          results.errorCount++;
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Bulk QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Export user URLs
   * @param {string} userId - User ID
   * @param {Object} options - Export options
   * @returns {Promise<Array>} URLs data for export
   * @throws {Error} If export fails
   */
  async exportUserUrls(userId, options = {}) {
    try {
      const {
        format = "json",
        includeInactive = false,
        includeExpired = false,
      } = options;

      const query = { userId };

      if (!includeInactive) {
        query.isActive = true;
      }

      // Build projection for export
      const projection = {
        originalUrl: 1,
        shortCode: 1,
        customAlias: 1,
        title: 1,
        description: 1,
        clickCount: 1,
        uniqueClicks: 1,
        isActive: 1,
        createdAt: 1,
        lastClickedAt: 1,
        expiresAt: 1,
      };

      let urls = await URL_MODEL.find(query, projection)
        .sort({ createdAt: -1 })
        .lean();

      // Filter expired URLs if needed
      if (!includeExpired) {
        urls = urls.filter(
          (url) => !url.expiresAt || url.expiresAt > new Date()
        );
      }

      // Add computed fields
      urls = urls.map((url) => ({
        ...url,
        shortUrl: `${config.baseUrl}/${url.shortCode}`,
        isExpired: url.expiresAt && url.expiresAt < new Date(),
        daysSinceCreation: Math.floor(
          (Date.now() - url.createdAt) / (1000 * 60 * 60 * 24)
        ),
      }));

      return urls;
    } catch (error) {
      throw new Error(`URL export failed: ${error.message}`);
    }
  }

  /**
   * Private method to validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  _isValidUrl(url) {
    if (!url || typeof url !== "string") {
      console.log("URL validation failed: invalid input type");
      return false;
    }

    try {
      const urlObject = new NodeURL(url); // Use Node.js URL instead of global URL
      const isValid = ["http:", "https:"].includes(urlObject.protocol);
      return isValid;
    } catch (error) {
      return false;
    }
  }
}

export default new UrlService();
