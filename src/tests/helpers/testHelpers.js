import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import URL_MODEL from "../../models/URL.js";
import Click from "../../models/Click.js";

export class TestHelper {
  static generateToken(userId, role = "user") {
    return jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1d" }
    );
  }

  static async createTestUser(userData = {}) {
    const defaultUser = {
      name: "Test User",
      email: "test@example.com",
      password: await bcrypt.hash("password123", 10),
      role: "user",
      isActive: true,
    };

    const user = new User({ ...defaultUser, ...userData });
    await user.save();

    return {
      user,
      token: this.generateToken(user._id, user.role),
    };
  }

  static async createTestAdmin(userData = {}) {
    return this.createTestUser({
      ...userData,
      role: "admin",
      email: "admin@example.com",
    });
  }

  static async createTestUrl(userId, urlData = {}) {
    const defaultUrl = {
      originalUrl: "https://example.com",
      shortCode: this.generateShortCode(),
      title: "Test URL",
      description: "Test description",
      userId,
      isActive: true,
    };

    const url = new URL_MODEL({ ...defaultUrl, ...urlData });
    await url.save();
    return url;
  }

  static async createTestClick(urlId, clickData = {}) {
    const defaultClick = {
      urlId,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test Browser",
      country: "US",
      city: "Test City",
      browser: "Chrome",
      os: "Windows",
      device: "desktop",
      isBot: false,
      isUnique: true,
      clickedAt: new Date(),
      ...clickData,
    };

    const click = new Click(defaultClick);
    await click.save();

    await URL_MODEL.findByIdAndUpdate(urlId, {
      $inc: {
        clickCount: 1,
        uniqueClicks: clickData.isUnique !== false ? 1 : 0,
      },
      lastClickedAt: new Date(),
    });

    return click;
  }

  static mockRequest(data = {}) {
    return {
      body: data,
      params: {},
      query: {},
      user: null,
      ...data,
    };
  }

  static mockResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    return res;
  }
  static generateShortCode(length = 8) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return (random + timestamp).substring(0, length);
  }
}
