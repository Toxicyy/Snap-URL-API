import analyticsService from '../services/analyticsService.js';
import urlService from '../services/urlService.js';
import { ApiResponse } from '../utils/responses.js';

/**
 * Analytics Controller for SnapURL
 * Handles HTTP requests for analytics, reporting, and statistics
 */

/**
 * Get detailed analytics for a specific URL
 * @route GET /api/analytics/url/:id
 * @access Private
 */
export const getUrlAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      startDate,
      endDate,
      excludeBots = 'true',
      includeRealTime = 'true'
    } = req.query;

    // Parse dates if provided
    const options = {
      excludeBots: excludeBots === 'true',
      includeRealTime: includeRealTime === 'true'
    };

    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const analytics = await analyticsService.getUrlAnalytics(id, options);

    res.status(200).json(
      ApiResponse.success(
        'URL analytics retrieved successfully',
        analytics
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get click analytics for specific time periods
 * @route GET /api/analytics/clicks
 * @access Private
 */
export const getClickAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      period = '7d', // '1d', '7d', '30d', '90d', 'custom'
      urlId,
      groupBy = 'day', // 'hour', 'day', 'week', 'month'
      startDate,
      endDate
    } = req.query;

    let actualStartDate, actualEndDate;

    // Parse period
    if (period === 'custom') {
      if (!startDate || !endDate) {
        return res.status(400).json(
          ApiResponse.error('Start date and end date required for custom period', null, 400)
        );
      }
      actualStartDate = new Date(startDate);
      actualEndDate = new Date(endDate);
    } else {
      const days = {
        '1d': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90
      };

      const daysBack = days[period] || 7;
      actualStartDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      actualEndDate = new Date();
    }

    const options = {
      startDate: actualStartDate,
      endDate: actualEndDate,
      userId: urlId ? null : userId, // If specific URL, don't filter by user
      urlId: urlId || null
    };

    const analytics = urlId 
      ? await analyticsService.getUrlAnalytics(urlId, options)
      : await analyticsService.getUserDashboard(userId, options);

    res.status(200).json(
      ApiResponse.success(
        'Click analytics retrieved successfully',
        {
          period,
          groupBy,
          dateRange: { startDate: actualStartDate, endDate: actualEndDate },
          analytics
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get top performing content
 * @route GET /api/analytics/top
 * @access Private
 */
export const getTopContent = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      metric = 'clicks', // 'clicks', 'uniqueClicks', 'ctr'
      limit = '10',
      days = '30'
    } = req.query;

    const options = {
      userId,
      limit: parseInt(limit),
      days: parseInt(days),
      minClicks: 1
    };

    // Get popular URLs based on the metric
    const urls = await urlService.getPopularUrls(options);

    // Sort by the requested metric
    let sortedUrls;
    switch (metric) {
      case 'uniqueClicks':
        sortedUrls = urls.sort((a, b) => b.uniqueClicks - a.uniqueClicks);
        break;
      case 'ctr':
        sortedUrls = urls.sort((a, b) => {
          const ctrA = a.clickCount > 0 ? (a.uniqueClicks / a.clickCount) : 0;
          const ctrB = b.clickCount > 0 ? (b.uniqueClicks / b.clickCount) : 0;
          return ctrB - ctrA;
        });
        break;
      default: // 'clicks'
        sortedUrls = urls.sort((a, b) => b.clickCount - a.clickCount);
    }

    res.status(200).json(
      ApiResponse.success(
        'Top performing content retrieved successfully',
        {
          metric,
          period: `${days} days`,
          urls: sortedUrls
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get geographic analytics
 * @route GET /api/analytics/geographic
 * @access Private
 */
export const getGeographicAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      urlId,
      startDate,
      endDate,
      level = 'country' // 'country', 'city'
    } = req.query;

    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    let analytics;
    if (urlId) {
      analytics = await analyticsService.getUrlAnalytics(urlId, options);
    } else {
      analytics = await analyticsService.getUserDashboard(userId, options);
    }

    const geoData = analytics.geographic || {};

    res.status(200).json(
      ApiResponse.success(
        'Geographic analytics retrieved successfully',
        {
          level,
          data: geoData,
          totalCountries: geoData.topCountries?.length || 0
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Clean up old analytics data (admin only)
 * @route POST /api/analytics/cleanup
 * @access Private (Admin)
 */
export const cleanupAnalyticsData = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json(
        ApiResponse.error('Access denied. Admin role required.', null, 403)
      );
    }

    const {
      retentionDays = 365,
      dryRun = true
    } = req.body;

    const options = {
      retentionDays: parseInt(retentionDays),
      dryRun
    };

    const result = await analyticsService.cleanupAnalyticsData(options);

    res.status(200).json(
      ApiResponse.success(
        dryRun ? 'Analytics cleanup simulation completed' : 'Analytics data cleanup completed',
        result,
        {
          warning: dryRun ? 'This was a simulation. Set dryRun=false to perform actual cleanup.' : null
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user dashboard analytics
 * @route GET /api/analytics/dashboard
 * @access Private
 */
export const getUserDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      startDate,
      endDate,
      limit = '10'
    } = req.query;

    const options = {
      limit: parseInt(limit)
    };

    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const dashboard = await analyticsService.getUserDashboard(userId, options);

    res.status(200).json(
      ApiResponse.success(
        'Dashboard analytics retrieved successfully',
        dashboard
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get platform analytics (admin only)
 * @route GET /api/analytics/platform
 * @access Private (Admin)
 */
export const getPlatformAnalytics = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json(
        ApiResponse.error('Access denied. Admin role required.', null, 403)
      );
    }

    const {
      startDate,
      endDate
    } = req.query;

    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const analytics = await analyticsService.getPlatformAnalytics(options);

    res.status(200).json(
      ApiResponse.success(
        'Platform analytics retrieved successfully',
        analytics
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get real-time analytics
 * @route GET /api/analytics/realtime
 * @access Private
 */
export const getRealTimeAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      minutes = '60'
    } = req.query;

    const options = {
      minutes: parseInt(minutes),
      userId
    };

    const realTimeData = await analyticsService.getRealTimeAnalytics(options);

    res.status(200).json(
      ApiResponse.success(
        'Real-time analytics retrieved successfully',
        realTimeData
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Generate analytics report
 * @route POST /api/analytics/report
 * @access Private
 */
export const generateReport = async (req, res, next) => {
  try {
    const {
      type = 'user',
      targetId,
      startDate,
      endDate,
      format = 'json',
      includeCharts = false
    } = req.body;

    // Validate permissions
    if (type === 'platform' && req.user.role !== 'admin') {
      return res.status(403).json(
        ApiResponse.error('Access denied. Admin role required for platform reports.', null, 403)
      );
    }

    // Set targetId to current user if not provided and type is user
    const finalTargetId = targetId || (type === 'user' ? req.user._id : null);

    const criteria = {
      type,
      targetId: finalTargetId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      format,
      includeCharts
    };

    const report = await analyticsService.generateReport(criteria);

    // Set appropriate content type for download
    if (format === 'json') {
      res.set('Content-Type', 'application/json');
    } else if (format === 'csv') {
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', `attachment; filename=analytics-report-${Date.now()}.csv`);
    }

    res.status(200).json(
      ApiResponse.success(
        'Analytics report generated successfully',
        report
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get analytics summary for multiple URLs
 * @route POST /api/analytics/summary
 * @access Private
 */
export const getAnalyticsSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      urlIds,
      startDate,
      endDate,
      metrics = ['clicks', 'uniqueVisitors', 'topCountries']
    } = req.body;

    if (!Array.isArray(urlIds) || urlIds.length === 0) {
      return res.status(400).json(
        ApiResponse.error('URL IDs array is required', null, 400)
      );
    }

    if (urlIds.length > 50) {
      return res.status(400).json(
        ApiResponse.error('Maximum 50 URLs allowed per summary request', null, 400)
      );
    }

    // Get analytics for each URL
    const summaryPromises = urlIds.map(async (urlId) => {
      try {
        const options = {};
        if (startDate) options.startDate = new Date(startDate);
        if (endDate) options.endDate = new Date(endDate);

        const analytics = await analyticsService.getUrlAnalytics(urlId, options);
        
        return {
          urlId,
          success: true,
          data: {
            overview: analytics.overview,
            url: analytics.url,
            // Include only requested metrics
            ...(metrics.includes('geographic') && { geographic: analytics.geographic }),
            ...(metrics.includes('technology') && { technology: analytics.technology }),
            ...(metrics.includes('traffic') && { traffic: analytics.traffic })
          }
        };
      } catch (error) {
        return {
          urlId,
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(summaryPromises);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.status(200).json(
      ApiResponse.success(
        'Analytics summary retrieved',
        {
          analytics: successful,
          errors: failed
        },
        {
          totalRequested: urlIds.length,
          successful: successful.length,
          failed: failed.length
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Export analytics data
 * @route GET /api/analytics/export
 * @access Private
 */
export const exportAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      type = 'user',
      format = 'json',
      startDate,
      endDate,
      includeDetailed = 'false'
    } = req.query;

    // Admin check for platform exports
    if (type === 'platform' && req.user.role !== 'admin') {
      return res.status(403).json(
        ApiResponse.error('Access denied. Admin role required.', null, 403)
      );
    }

    const criteria = {
      type,
      targetId: type === 'user' ? userId : null,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      format,
      includeDetailed: includeDetailed === 'true'
    };

    const exportData = await analyticsService.generateReport(criteria);

    // Set download headers
    const filename = `snapurl-analytics-${type}-${Date.now()}.${format}`;
    res.set({
      'Content-Type': format === 'json' ? 'application/json' : 'text/csv',
      'Content-Disposition': `attachment; filename=${filename}`
    });

    res.status(200).json(exportData);
  } catch (error) {
    next(error);
  }
};