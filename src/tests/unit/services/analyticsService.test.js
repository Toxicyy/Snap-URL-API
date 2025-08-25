import analyticsService from "../../../services/analyticsService.js";
import { TestHelper } from "../../helpers/testHelpers.js";
import URL from "../../../models/URL.js"; //
import Click from "../../../models/Click.js";

describe("AnalyticsService", () => {
  let testUser, testUrl;

  beforeEach(async () => {
    const userData = await TestHelper.createTestUser();
    testUser = userData.user;
    testUrl = await TestHelper.createTestUrl(testUser._id);
  });

  describe("recordClick", () => {
    it("should record a click successfully", async () => {
      const clickData = {
        urlId: testUrl._id,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0 Chrome Test",
        referrer: "https://google.com",
        userId: testUser._id,
      };

      const result = await analyticsService.recordClick(clickData);

      expect(result.click).toBeDefined();
      expect(result.redirectUrl).toBe(testUrl.originalUrl);
      expect(result.analytics.isUnique).toBe(true);
    });

    it("should handle inactive URL", async () => {
      const inactiveUrl = await TestHelper.createTestUrl(testUser._id, {
        isActive: false,
      });

      const clickData = {
        urlId: inactiveUrl._id,
        ipAddress: "127.0.0.1",
      };

      await expect(analyticsService.recordClick(clickData)).rejects.toThrow(
        "URL not found or inactive"
      );
    });
  });

  describe("getUrlAnalytics", () => {
    it("should return comprehensive URL analytics", async () => {
      // Create some test clicks
      await TestHelper.createTestClick(testUrl._id, {
        country: "US",
        browser: "Chrome",
      });
      await TestHelper.createTestClick(testUrl._id, {
        country: "CA",
        browser: "Firefox",
      });

      const result = await analyticsService.getUrlAnalytics(testUrl._id);

      expect(result.url.id.toString()).toBe(testUrl._id.toString());
      expect(result.overview).toBeDefined();
      expect(result.geographic).toBeDefined();
      expect(result.technology).toBeDefined();
      expect(result.traffic).toBeDefined();
    });

    it("should filter by date range", async () => {
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const recentDate = new Date();

      // Create old click
      await TestHelper.createTestClick(testUrl._id, {
        clickedAt: oldDate,
      });

      const result = await analyticsService.getUrlAnalytics(testUrl._id, {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: recentDate,
      });

      // Should not include old click
      expect(result.overview.totalClicks).toBe(0);
    });

    it("should exclude bots when requested", async () => {
      await TestHelper.createTestClick(testUrl._id, {
        isBot: true,
        userAgent: "Googlebot",
      });
      await TestHelper.createTestClick(testUrl._id, {
        isBot: false,
        userAgent: "Chrome",
      });

      const result = await analyticsService.getUrlAnalytics(testUrl._id, {
        excludeBots: true,
      });

      expect(result.overview.totalClicks).toBe(1);
    });
  });

  describe("getUserDashboard", () => {
    it("should return user dashboard analytics", async () => {
      // Очищаем все URLs этого пользователя перед тестом
      await URL.deleteMany({ userId: testUser._id }); // URL вместо URL_MODEL
      await Click.deleteMany({});

      const url1 = await TestHelper.createTestUrl(testUser._id, {
        shortCode: "dashboard-url1",
      });
      const url2 = await TestHelper.createTestUrl(testUser._id, {
        shortCode: "dashboard-url2",
      });

      await TestHelper.createTestClick(url1._id);
      await TestHelper.createTestClick(url2._id);

      const result = await analyticsService.getUserDashboard(testUser._id);

      expect(result.userId.toString()).toBe(testUser._id.toString());
      expect(result.overview.totalClicks).toBe(2);
      expect(result.topUrls).toHaveLength(2);
    });

    it("should return empty dashboard for user with no URLs", async () => {
      const newUser = await TestHelper.createTestUser({
        email: "empty@example.com",
      });

      const result = await analyticsService.getUserDashboard(newUser.user._id);

      expect(result.overview.totalClicks).toBe(0);
      expect(result.topUrls).toHaveLength(0);
    });
  });

  describe("getRealTimeAnalytics", () => {
    it("should return real-time analytics", async () => {
      // Create recent click
      await TestHelper.createTestClick(testUrl._id, {
        clickedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      });

      const result = await analyticsService.getRealTimeAnalytics({
        minutes: 60,
        userId: testUser._id,
      });

      expect(result.timeWindow).toBe("60 minutes");
      expect(result.statistics).toBeDefined();
      expect(result.activeUrls).toBeDefined();
      expect(result.liveVisitors).toBeDefined();
    });
  });
});
