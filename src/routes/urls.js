import express from "express";
import {
  createUrl,
  getUserUrls,
  getUrlById,
  updateUrl,
  deleteUrl,
  generateQRCode,
  searchUrls,
  getPopularUrls,
  bulkCreateUrls,
  exportUrls,
  getUrlPreview,
  getUrlStats,
} from "../controllers/urlController.js";
import { protect, optionalAuth } from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validation.js";
import { createUrlLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateUrlRequest:
 *       type: object
 *       required:
 *         - originalUrl
 *       properties:
 *         originalUrl:
 *           type: string
 *           format: uri
 *           example: "https://example.com/very-long-url"
 *           description: The original long URL to shorten
 *         customAlias:
 *           type: string
 *           pattern: '^[A-Za-z0-9_-]{3,30}$'
 *           example: "myCustomLink"
 *           description: Custom alias for the short URL (optional)
 *         title:
 *           type: string
 *           maxLength: 100
 *           example: "My Important Link"
 *           description: User-defined title for the URL
 *         description:
 *           type: string
 *           maxLength: 500
 *           example: "This is a link to my portfolio"
 *           description: Description of the URL
 *         generateQR:
 *           type: boolean
 *           default: true
 *           description: Whether to generate QR code
 *         fetchMetadata:
 *           type: boolean
 *           default: true
 *           description: Whether to fetch page metadata
 *         expiresIn:
 *           type: number
 *           example: 30
 *           description: Expiration time in days (optional)
 *
 *     UrlResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             url:
 *               $ref: '#/components/schemas/URL'
 *             shortUrl:
 *               type: string
 *               example: "https://snapurl.dev/K3n9mP2"
 *         meta:
 *           type: object
 *           properties:
 *             isNew:
 *               type: boolean
 *             qrCodePending:
 *               type: boolean
 *             metadataPending:
 *               type: boolean
 */

/**
 * @swagger
 * /api/urls:
 *   post:
 *     summary: Create a new shortened URL
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUrlRequest'
 *     responses:
 *       201:
 *         description: URL shortened successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UrlResponse'
 *       200:
 *         description: URL already exists (returned existing)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UrlResponse'
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  "/",
  optionalAuth, // Allow anonymous URL creation
  createUrlLimiter,
  validate(schemas.createUrl),
  createUrl
);

/**
 * @swagger
 * /api/urls:
 *   get:
 *     summary: Get all URLs for the authenticated user
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of URLs per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, clickCount, title, lastClickedAt]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for URL titles and descriptions
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: URLs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/URL'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalUrls:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         description: Authentication required
 */
router.get("/", protect, getUserUrls);

/**
 * @swagger
 * /api/urls/search:
 *   get:
 *     summary: Search URLs by title, description, or original URL
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, recent, popular]
 *           default: relevance
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Search query required
 *       401:
 *         description: Authentication required
 */
router.get("/search", protect, searchUrls);

/**
 * @swagger
 * /api/urls/popular:
 *   get:
 *     summary: Get popular URLs for the authenticated user
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *           maximum: 365
 *         description: Time period in days to consider
 *       - in: query
 *         name: minClicks
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Minimum clicks required
 *     responses:
 *       200:
 *         description: Popular URLs retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get("/popular", protect, getPopularUrls);

/**
 * @swagger
 * /api/urls/export:
 *   get:
 *     summary: Export user URLs to various formats
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *       - in: query
 *         name: includeAnalytics
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Export data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Authentication required
 */
router.get("/export", protect, exportUrls);

/**
 * @swagger
 * /api/urls/preview/{shortCode}:
 *   get:
 *     summary: Get URL preview without authentication
 *     tags: [URLs]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Short code or custom alias
 *     responses:
 *       200:
 *         description: URL preview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     originalUrl:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     domain:
 *                       type: string
 *                     favicon:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     qrCode:
 *                       type: string
 *       404:
 *         description: URL not found or expired
 */
router.get("/preview/:shortCode", getUrlPreview);

/**
 * @swagger
 * /api/urls/bulk:
 *   post:
 *     summary: Create multiple URLs in a single request
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urls
 *             properties:
 *               urls:
 *                 type: array
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required:
 *                     - originalUrl
 *                   properties:
 *                     originalUrl:
 *                       type: string
 *                       format: uri
 *                     customAlias:
 *                       type: string
 *                     title:
 *                       type: string
 *               generateQR:
 *                 type: boolean
 *                 default: false
 *               fetchMetadata:
 *                 type: boolean
 *                 default: false
 *               skipDuplicates:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Bulk URL creation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: array
 *                     skipped:
 *                       type: array
 *                     errors:
 *                       type: array
 *                 meta:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         created:
 *                           type: integer
 *                         skipped:
 *                           type: integer
 *                         errors:
 *                           type: integer
 *       400:
 *         description: Validation error or too many URLs
 *       401:
 *         description: Authentication required
 */
router.post("/bulk", protect, createUrlLimiter, bulkCreateUrls);

/**
 * @swagger
 * /api/urls/{id}:
 *   get:
 *     summary: Get a specific URL by ID
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: URL ID
 *     responses:
 *       200:
 *         description: URL retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied (not your URL)
 *       404:
 *         description: URL not found
 */
router.get("/:id", protect, getUrlById);

/**
 * @swagger
 * /api/urls/{id}:
 *   put:
 *     summary: Update URL properties
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: URL ID
 *         example: "67a1b2c3d4e5f6789abcdef0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUrlRequest'
 *           example:
 *             title: "Updated Link Title"
 *             description: "Updated description for my important link"
 *             isActive: true
 *             expiresIn: 90
 *             generateQR: true
 *             fetchMetadata: false
 *     responses:
 *       200:
 *         description: URL updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "URL updated successfully"
 *               data:
 *                 id: "67a1b2c3d4e5f6789abcdef0"
 *                 originalUrl: "https://example.com/very-long-url"
 *                 shortUrl: "https://snap.ly/abc123"
 *                 shortCode: "abc123"
 *                 title: "Updated Link Title"
 *                 description: "Updated description for my important link"
 *                 isActive: true
 *                 expiresAt: "2025-11-22T10:30:00.000Z"
 *                 clickCount: 15
 *                 createdAt: "2025-08-24T10:30:00.000Z"
 *                 updatedAt: "2025-08-24T12:45:00.000Z"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Validation failed"
 *               error: "Description cannot exceed 500 characters"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Authentication required"
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Access denied. You don't have permission to update this URL"
 *       404:
 *         description: URL not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "URL not found"
 */
router.put("/:id", protect, validate(schemas.updateUrl), updateUrl);

/**
 * @swagger
 * /api/urls/{id}:
 *   delete:
 *     summary: Delete or deactivate URL
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: hardDelete
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Permanently delete (true) or deactivate (false)
 *     responses:
 *       200:
 *         description: URL deleted/deactivated successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: URL not found
 */
router.delete("/:id", protect, deleteUrl);

/**
 * @swagger
 * /api/urls/{id}/qr:
 *   post:
 *     summary: Generate QR code for URL
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               size:
 *                 type: integer
 *                 enum: [128, 256, 512, 1024]
 *                 default: 256
 *               primaryColor:
 *                 type: string
 *                 pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *                 default: '#000000'
 *               backgroundColor:
 *                 type: string
 *                 pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *                 default: '#FFFFFF'
 *               format:
 *                 type: string
 *                 enum: [png, svg]
 *                 default: png
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: string
 *                       description: Base64 data URL of QR code
 *                     url:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         shortUrl:
 *                           type: string
 *                         title:
 *                           type: string
 *       401:
 *         description: Authentication required
 *       404:
 *         description: URL not found
 */
router.post("/:id/qr", protect, generateQRCode);

/**
 * @swagger
 * /api/urls/{id}/stats:
 *   get:
 *     summary: Get detailed URL statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: URL statistics retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: URL not found
 */
router.get("/:id/stats", protect, getUrlStats);

export default router;
