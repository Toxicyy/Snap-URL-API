import express from 'express';
import {
  handleRedirect,
  getRedirectPreview,
  handleTrackedRedirect,
  getPublicStats,
  handleQRRedirect,
  validateBatchRedirects,
  handlePasswordProtectedRedirect
} from '../controllers/redirectController.js';
import { redirectLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Routes for redirect functionality

/**
 * @swagger
 * /preview/{shortCode}:
 *   get:
 *     summary: Get redirect preview without actual redirect
 *     tags: [Redirects]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Short code or custom alias
 *     responses:
 *       200:
 *         description: Redirect preview retrieved successfully
 *       404:
 *         description: Short URL not found or expired
 */
router.get('/preview/:shortCode', getRedirectPreview);

/**
 * @swagger
 * /qr/{shortCode}:
 *   get:
 *     summary: Redirect from QR code scan
 *     tags: [Redirects]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to original URL (QR code source tracked)
 *       404:
 *         description: QR code target not found or expired
 */
router.get('/qr/:shortCode', redirectLimiter, handleQRRedirect);

/**
 * @swagger
 * /validate-batch:
 *   post:
 *     summary: Validate multiple short codes in a single request
 *     tags: [Redirects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shortCodes
 *             properties:
 *               shortCodes:
 *                 type: array
 *                 maxItems: 50
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Batch validation completed
 *       400:
 *         description: Invalid request
 */
router.post('/validate-batch', validateBatchRedirects);

/**
 * @swagger
 * /{shortCode}/track:
 *   get:
 *     summary: Redirect with enhanced tracking parameters
 *     tags: [Redirects]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to original URL with tracking
 *       404:
 *         description: Short URL not found or expired
 */
router.get('/:shortCode/track', redirectLimiter, handleTrackedRedirect);

/**
 * @swagger
 * /{shortCode}/stats:
 *   get:
 *     summary: Get public statistics for a short URL
 *     tags: [Redirects]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public statistics retrieved successfully
 *       404:
 *         description: Short URL not found or expired
 */
router.get('/:shortCode/stats', getPublicStats);

/**
 * @swagger
 * /{shortCode}/unlock:
 *   post:
 *     summary: Unlock password-protected short URL
 *     tags: [Redirects]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: URL unlocked successfully
 *       401:
 *         description: Invalid password
 *       404:
 *         description: Short URL not found or expired
 */
router.post('/:shortCode/unlock', handlePasswordProtectedRedirect);

/**
 * @swagger
 * /{shortCode}:
 *   get:
 *     summary: Redirect to original URL
 *     tags: [Redirects]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Short code or custom alias
 *     responses:
 *       302:
 *         description: Redirect to original URL
 *       404:
 *         description: Short URL not found or expired
 */
// This should be LAST to avoid conflicts with other routes
router.get('/:shortCode', redirectLimiter, handleRedirect);

export default router;