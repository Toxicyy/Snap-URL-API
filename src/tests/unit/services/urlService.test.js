import urlService from "../../../services/urlService.js";
import { TestHelper } from "../../helpers/testHelpers.js";

describe("UrlService", () => {
  let testUser;

  beforeEach(async () => {
    const userData = await TestHelper.createTestUser();
    testUser = userData.user;
  });

  describe("createUrl", () => {
    it("should create a new URL successfully", async () => {
      const urlData = {
        originalUrl: "https://google.com",
        title: "Google",
        userId: testUser._id,
      };

      const result = await urlService.createUrl(urlData);

      expect(result.isNew).toBe(true);
      expect(result.url.originalUrl).toBe(urlData.originalUrl);
      expect(result.url.shortCode).toBeDefined();
      expect(result.shortUrl).toContain(result.url.shortCode);
    });

    it("should return existing URL for duplicate", async () => {
      const urlData = {
        originalUrl: "https://google.com",
        userId: testUser._id,
      };

      // Create first URL
      await urlService.createUrl(urlData);

      // Try to create duplicate
      const result = await urlService.createUrl(urlData);

      expect(result.isNew).toBe(false);
      expect(result.message).toContain("already exists");
    });

    it("should reject invalid URL format", async () => {
      const urlData = {
        originalUrl: "not-a-valid-url",
        userId: testUser._id,
      };

      await expect(urlService.createUrl(urlData)).rejects.toThrow(
        "Invalid URL format"
      );
    });

    it("should create URL with custom alias", async () => {
      const urlData = {
        originalUrl: "https://github.com",
        customAlias: "github",
        userId: testUser._id,
      };

      const result = await urlService.createUrl(urlData);

      expect(result.url.shortCode).toBe("github");
      expect(result.url.customAlias).toBe("github");
    });

    it("should reject duplicate custom alias", async () => {
      const urlData = {
        originalUrl: "https://example.com",
        customAlias: "duplicate",
        userId: testUser._id,
      };

      await urlService.createUrl(urlData);

      const duplicateData = {
        originalUrl: "https://different.com",
        customAlias: "duplicate",
        userId: testUser._id,
      };

      await expect(urlService.createUrl(duplicateData)).rejects.toThrow(
        "Custom alias is already taken"
      );
    });
  });

  describe("getUrlByShortCode", () => {
    it("should retrieve URL by short code", async () => {
      const testUrl = await TestHelper.createTestUrl(testUser._id, {
        shortCode: "test123",
      });

      const result = await urlService.getUrlByShortCode("test123");

      expect(result).toBeTruthy();
      expect(result._id.toString()).toBe(testUrl._id.toString());
    });

    it("should return null for non-existent short code", async () => {
      const result = await urlService.getUrlByShortCode("nonexistent");
      expect(result).toBeNull();
    });

    it("should increment view count when requested", async () => {
      const testUrl = await TestHelper.createTestUrl(testUser._id, {
        shortCode: "test123",
        clickCount: 5,
      });

      const result = await urlService.getUrlByShortCode("test123", true);

      expect(result.clickCount).toBe(6);
    });
  });

  describe("getUserUrls", () => {
    it("should return paginated user URLs", async () => {
      // Create multiple test URLs
      for (let i = 0; i < 15; i++) {
        await TestHelper.createTestUrl(testUser._id, {
          shortCode: `test${i}`,
          originalUrl: `https://example${i}.com`,
        });
      }

      const result = await urlService.getUserUrls(testUser._id, {
        page: 1,
        limit: 10,
      });

      expect(result.urls).toHaveLength(10);
      expect(result.pagination.totalUrls).toBe(15);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNextPage).toBe(true);
    });

    it("should search URLs by title", async () => {
      await TestHelper.createTestUrl(testUser._id, {
        title: "GitHub Repository",
        shortCode: "github1",
      });
      await TestHelper.createTestUrl(testUser._id, {
        title: "Google Search",
        shortCode: "google1",
      });

      const result = await urlService.getUserUrls(testUser._id, {
        search: "GitHub",
      });

      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].title).toContain("GitHub");
    });
  });

  describe("getPopularUrls", () => {
    it("should return URLs sorted by click count", async () => {
      const url1 = await TestHelper.createTestUrl(testUser._id, {
        shortCode: "url1",
        clickCount: 10,
      });
      const url2 = await TestHelper.createTestUrl(testUser._id, {
        shortCode: "url2",
        clickCount: 20,
      });
      const url3 = await TestHelper.createTestUrl(testUser._id, {
        shortCode: "url3",
        clickCount: 5,
      });

      const result = await urlService.getPopularUrls({
        userId: testUser._id,
        limit: 10,
      });

      expect(result).toHaveLength(3);
      expect(result[0].clickCount).toBe(20); // url2
      expect(result[1].clickCount).toBe(10); // url1
      expect(result[2].clickCount).toBe(5); // url3
    });

    it("should filter by minimum clicks", async () => {
      await TestHelper.createTestUrl(testUser._id, {
        shortCode: "high",
        clickCount: 15,
      });
      await TestHelper.createTestUrl(testUser._id, {
        shortCode: "low",
        clickCount: 2,
      });

      const result = await urlService.getPopularUrls({
        userId: testUser._id,
        minClicks: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].clickCount).toBe(15);
    });
  });

  describe("bulkCreateUrls", () => {
    it("should create multiple URLs successfully", async () => {
      const urlsData = [
        { originalUrl: "https://google.com", title: "Google" },
        { originalUrl: "https://github.com", title: "GitHub" },
        { originalUrl: "https://stackoverflow.com", title: "Stack Overflow" },
      ];

      const result = await urlService.bulkCreateUrls(urlsData, testUser._id);

      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(0);
      expect(result.successful).toHaveLength(3);
    });

    it("should handle individual failures in bulk creation", async () => {
      const urlsData = [
        { originalUrl: "https://valid.com", title: "Valid" },
        { originalUrl: "invalid-url", title: "Invalid" },
        { originalUrl: "https://another-valid.com", title: "Valid 2" },
      ];

      const result = await urlService.bulkCreateUrls(urlsData, testUser._id);

      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
      expect(result.failed[0].originalUrl).toBe("invalid-url");
    });

    it("should reject too many URLs", async () => {
      const urlsData = Array(101)
        .fill()
        .map((_, i) => ({
          originalUrl: `https://example${i}.com`,
        }));

      await expect(
        urlService.bulkCreateUrls(urlsData, testUser._id)
      ).rejects.toThrow("Maximum 100 URLs allowed");
    });
  });
});
