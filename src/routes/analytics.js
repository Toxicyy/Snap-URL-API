import express from "express";
import {
  getUrlAnalytics,
  getUserDashboard,
  getPlatformAnalytics,
  getRealTimeAnalytics,
  generateReport,
  getAnalyticsSummary,
  exportAnalytics,
  getClickAnalytics,
  getTopContent,
  getGeographicAnalytics,
  cleanupAnalyticsData,
} from "../controllers/analyticsController.js";
import { protect } from "../middleware/auth.js";
import { analyticsLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AnalyticsOverview:
 *       type: object
 *       properties:
 *         totalClicks:
 *           type: number
 *           description: Total number of clicks
 *         uniqueClicks:
 *           type: number
 *           description: Number of unique clicks
 *         uniqueVisitors:
 *           type: number
 *           description: Number of unique visitors
 *         averageLoadTime:
 *           type: number
 *           description: Average page load time in milliseconds
 *
 *     GeographicData:
 *       type: object
 *       properties:
 *         byCountry:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Country code
 *               count:
 *                 type: number
 *               countryName:
 *                 type: string
 *         topCountries:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               count:
 *                 type: number
 *               countryName:
 *                 type: string
 *
 *     TechnologyData:
 *       type: object
 *       properties:
 *         byDevice:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Device type
 *               count:
 *                 type: number
 *         byBrowser:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Browser name
 *               count:
 *                 type: number
 *         topBrowsers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               count:
 *                 type: number
 *
 *     UrlAnalytics:
 *       type: object
 *       properties:
 *         url:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             originalUrl:
 *               type: string
 *             shortUrl:
 *               type: string
 *             title:
 *               type: string
 *             createdAt:
 *               type: string
 *               format: date-time
 *             isActive:
 *               type: boolean
 *         overview:
 *           $ref: '#/components/schemas/AnalyticsOverview'
 *         geographic:
 *           $ref: '#/components/schemas/GeographicData'
 *         technology:
 *           $ref: '#/components/schemas/TechnologyData'
 *         traffic:
 *           type: object
 *           properties:
 *             byReferrer:
 *               type: array
 *             clicksByHour:
 *               type: array
 *             clicksByDay:
 *               type: array
 *         performance:
 *           type: object
 *           properties:
 *             clicksPerDay:
 *               type: number
 *             conversionRate:
 *               type: number
 *             engagementScore:
 *               type: number
 *             peakHour:
 *               type: number
 *             trendDirection:
 *               type: string
 *               enum: [up, down, stable]
 *         realTime:
 *           type: object
 *           properties:
 *             clicksLast5Minutes:
 *               type: number
 *             clicksLastHour:
 *               type: number
 *             activeCountries:
 *               type: array
 *             lastUpdated:
 *               type: string
 *               format: date-time
 *         dateRange:
 *           type: object
 *           properties:
 *             startDate:
 *               type: string
 *               format: date-time
 *             endDate:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * /api/analytics/url/{id}:
 *   get:
 *     summary: Get detailed analytics for a specific URL
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: URL ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics period
 *       - in: query
 *         name: excludeBots
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Exclude bot traffic from analytics
 *       - in: query
 *         name: includeRealTime
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include real-time statistics
 *     responses:
 *       200:
 *         description: URL analytics retrieved successfully
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
 *                   $ref: '#/components/schemas/UrlAnalytics'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: URL not found
 */
router.get("/url/:id", protect, analyticsLimiter, getUrlAnalytics);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get user dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Number of top URLs to include
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved successfully
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
 *                     userId:
 *                       type: string
 *                     overview:
 *                       $ref: '#/components/schemas/AnalyticsOverview'
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           clicks:
 *                             type: number
 *                           uniqueVisitors:
 *                             type: number
 *                     geographic:
 *                       type: object
 *                       properties:
 *                         topCountries:
 *                           type: array
 *                     topUrls:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           originalUrl:
 *                             type: string
 *                           shortUrl:
 *                             type: string
 *                           title:
 *                             type: string
 *                           clickCount:
 *                             type: number
 *                           uniqueClicks:
 *                             type: number
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           url:
 *                             type: object
 *                           location:
 *                             type: string
 *                           device:
 *                             type: string
 *       401:
 *         description: Authentication required
 */
router.get("/dashboard", protect, analyticsLimiter, getUserDashboard);

/**
 * @swagger
 * /api/analytics/platform:
 *   get:
 *     summary: Get platform-wide analytics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Platform analytics retrieved successfully
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
 *                     overview:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: object
 *                         urls:
 *                           type: object
 *                         clicks:
 *                           type: object
 *                     growth:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: object
 *                         urls:
 *                           type: object
 *                         clicks:
 *                           type: object
 *                     performance:
 *                       type: object
 *                     trends:
 *                       type: array
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin role required
 */
router.get("/platform", protect, analyticsLimiter, getPlatformAnalytics);

/**
 * @swagger
 * /api/analytics/realtime:
 *   get:
 *     summary: Get real-time analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: minutes
 *         schema:
 *           type: integer
 *           default: 60
 *           maximum: 1440
 *         description: Time window in minutes for real-time data
 *     responses:
 *       200:
 *         description: Real-time analytics retrieved successfully
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
 *                     timeWindow:
 *                       type: string
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         recentClicks:
 *                           type: number
 *                         activeUrls:
 *                           type: number
 *                         activeCountries:
 *                           type: number
 *                         avgClicksPerMinute:
 *                           type: number
 *                     activeUrls:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           shortUrl:
 *                             type: string
 *                           title:
 *                             type: string
 *                           clickCount:
 *                             type: number
 *                           uniqueVisitors:
 *                             type: number
 *                           lastClick:
 *                             type: string
 *                             format: date-time
 *                     liveVisitors:
 *                       type: number
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Authentication required
 */
router.get("/realtime", protect, getRealTimeAnalytics);

/**
 * @swagger
 * /api/analytics/clicks:
 *   get:
 *     summary: Get click analytics for specific time periods
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d, 90d, custom]
 *           default: 7d
 *       - in: query
 *         name: urlId
 *         schema:
 *           type: string
 *         description: Specific URL ID (optional)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Required if period is 'custom'
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Required if period is 'custom'
 *     responses:
 *       200:
 *         description: Click analytics retrieved successfully
 *       400:
 *         description: Invalid parameters (missing dates for custom period)
 *       401:
 *         description: Authentication required
 */
router.get("/clicks", protect, analyticsLimiter, getClickAnalytics);

/**
 * @swagger
 * /api/analytics/top:
 *   get:
 *     summary: Get top performing content
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [clicks, uniqueClicks, ctr]
 *           default: clicks
 *         description: Metric to sort by
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
 *           default: 30
 *           maximum: 365
 *         description: Time period in days
 *     responses:
 *       200:
 *         description: Top performing content retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get("/top", protect, analyticsLimiter, getTopContent);

/**
 * @swagger
 * /api/analytics/geographic:
 *   get:
 *     summary: Get geographic analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: urlId
 *         schema:
 *           type: string
 *         description: Specific URL ID (optional)
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
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [country, city]
 *           default: country
 *     responses:
 *       200:
 *         description: Geographic analytics retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get("/geographic", protect, analyticsLimiter, getGeographicAnalytics);

/**
 * @swagger
 * /api/analytics/report:
 *   post:
 *     summary: Generate analytics report
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [url, user, platform]
 *                 default: user
 *                 description: Type of report to generate
 *               targetId:
 *                 type: string
 *                 description: Target ID (URL ID for url reports, User ID for user reports)
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               format:
 *                 type: string
 *                 enum: [json, csv]
 *                 default: json
 *               includeCharts:
 *                 type: boolean
 *                 default: false
 *                 description: Include chart configuration data
 *     responses:
 *       200:
 *         description: Analytics report generated successfully
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
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                         targetId:
 *                           type: string
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                         dateRange:
 *                           type: object
 *                         format:
 *                           type: string
 *                     data:
 *                       type: object
 *                       description: Report data (structure depends on report type)
 *                     charts:
 *                       type: object
 *                       description: Chart configuration data (if includeCharts=true)
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied (for platform reports)
 */
router.post("/report", protect, analyticsLimiter, generateReport);

/**
 * @swagger
 * /api/analytics/summary:
 *   post:
 *     summary: Get analytics summary for multiple URLs
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urlIds
 *             properties:
 *               urlIds:
 *                 type: array
 *                 maxItems: 50
 *                 items:
 *                   type: string
 *                 description: Array of URL IDs to get analytics for
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [clicks, uniqueVisitors, topCountries, geographic, technology, traffic]
 *                 default: [clicks, uniqueVisitors, topCountries]
 *                 description: Metrics to include in summary
 *     responses:
 *       200:
 *         description: Analytics summary retrieved successfully
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
 *                     analytics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           urlId:
 *                             type: string
 *                           success:
 *                             type: boolean
 *                           data:
 *                             type: object
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           urlId:
 *                             type: string
 *                           success:
 *                             type: boolean
 *                           error:
 *                             type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalRequested:
 *                       type: integer
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *       400:
 *         description: Validation error or too many URLs
 *       401:
 *         description: Authentication required
 */
router.post("/summary", protect, analyticsLimiter, getAnalyticsSummary);

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [user, platform]
 *           default: user
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
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
 *       - in: query
 *         name: includeDetailed
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Analytics export retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin role required (for platform exports)
 */
router.get("/export", protect, analyticsLimiter, exportAnalytics);

/**
 * @swagger
 * /api/analytics/cleanup:
 *   post:
 *     summary: Clean up old analytics data (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               retentionDays:
 *                 type: integer
 *                 default: 365
 *                 minimum: 30
 *                 maximum: 3650
 *                 description: Number of days to retain analytics data
 *               dryRun:
 *                 type: boolean
 *                 default: true
 *                 description: Simulate cleanup without actually deleting data
 *     responses:
 *       200:
 *         description: Analytics cleanup completed or simulated
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
 *                     dryRun:
 *                       type: boolean
 *                     recordsToDelete:
 *                       type: number
 *                       description: Number of records that would be deleted (dry run)
 *                     deletedCount:
 *                       type: number
 *                       description: Number of records actually deleted
 *                     cutoffDate:
 *                       type: string
 *                       format: date-time
 *                     retentionDays:
 *                       type: integer
 *                     cleanupDate:
 *                       type: string
 *                       format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     warning:
 *                       type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin role required
 */
router.post("/cleanup", protect, cleanupAnalyticsData);

export default router;
