import {
  generateShortCode,
  validateShortCode,
} from "../../utils/shortCodeGenerator.js";

describe("Short Code Generator Utils", () => {
  describe("generateShortCode", () => {
    it("should generate short code of correct length", () => {
      const shortCode = generateShortCode();

      expect(typeof shortCode).toBe("string");
      expect(shortCode.length).toBeGreaterThan(0);
      expect(shortCode.length).toBeLessThanOrEqual(10);
    });

    it("should generate unique codes", () => {
      const codes = new Set();

      for (let i = 0; i < 100; i++) {
        codes.add(generateShortCode());
      }

      // Should have close to 100 unique codes
      expect(codes.size).toBeGreaterThan(95);
    });

    it("should only contain valid characters", () => {
      const validChars = /^[A-Za-z0-9_-]+$/;

      for (let i = 0; i < 50; i++) {
        const code = generateShortCode();
        expect(validChars.test(code)).toBe(true);
      }
    });
  });

  describe("validateShortCode", () => {
    it("should validate correct short code", () => {
      const result = validateShortCode("abc123");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty code", () => {
      const result = validateShortCode("");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject code with invalid characters", () => {
      const result = validateShortCode("abc@123");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Short code contains invalid characters");
    });

    it("should reject very long code", () => {
      const longCode = "a".repeat(50);
      const result = validateShortCode(longCode);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Short code is too long (max 30 characters)"
      );
    });

    it("should reject very short code", () => {
      const result = validateShortCode("ab");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Short code is too short (min 3 characters)"
      );
    });
  });
});
