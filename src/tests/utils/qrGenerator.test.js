import {
  validateUrlForQR,
  generateQRCode,
  generateQRCodeSVG,
} from "../../utils/qrGenerator.js";

describe("QR Generator Utils", () => {
  describe("validateUrlForQR", () => {
    it("should validate correct URL", () => {
      const result = validateUrlForQR("https://example.com");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty URL", () => {
      const result = validateUrlForQR("");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("URL is required");
    });

    it("should reject invalid URL format", () => {
      const result = validateUrlForQR("not-a-url");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid URL format");
    });

    it("should reject very long URL", () => {
      const longUrl = "https://" + "a".repeat(2050) + ".com";
      const result = validateUrlForQR(longUrl);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "URL is too long for QR code (max 2048 characters)"
      );
    });

    it("should detect problematic characters", () => {
      const urlWithSpecialChars = "https://example.com/\u0000\u0001";
      const result = validateUrlForQR(urlWithSpecialChars);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "URL contains non-printable characters that may cause issues"
      );
    });
  });

  describe("generateQRCode", () => {
    it("should generate QR code successfully", async () => {
      const result = await generateQRCode("https://example.com", {
        width: 256,
        height: 256,
        format: "png",
      });

      expect(result.data).toBeDefined();
      expect(result.dataURL).toContain("data:image/png;base64,");
    });

    it("should handle different formats", async () => {
      const svgResult = await generateQRCode("https://example.com", {
        format: "svg",
      });

      expect(svgResult.dataURL).toContain("data:image/svg+xml;utf8");
      expect(typeof svgResult.data).toBe("string");
      expect(svgResult.data).toContain("<svg");
    });

    it("should handle different sizes", async () => {
      const smallResult = await generateQRCode("https://example.com", {
        width: 128,
        height: 128,
      });

      const largeResult = await generateQRCode("https://example.com", {
        width: 512,
        height: 512,
      });

      expect(smallResult.data).toBeDefined();
      expect(largeResult.data).toBeDefined();
      expect(largeResult.data.length).toBeGreaterThan(smallResult.data.length);
    });
  });
});
