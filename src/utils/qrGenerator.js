import QRCode from "qrcode";

/**
 * QR Code generator utility for SnapURL service
 * Provides methods to generate QR codes for shortened URLs with various customization options
 */

/**
 * Default QR code generation options
 * Optimized for URL shortening service requirements
 */
const DEFAULT_OPTIONS = {
  errorCorrectionLevel: "M", // Medium error correction (15% recovery)
  margin: 1,
  color: {
    dark: "#000000", // Black foreground
    light: "#FFFFFF", // White background
  },
  width: 256, // Default size in pixels
};

/**
 * Generates a QR code in the specified format
 * @param {string} url - The URL to encode in the QR code
 * @param {Object} options - Customization options
 * @returns {Promise<{data: Buffer|string, dataURL: string}>} Object containing data and data URL
 */
export const generateQRCode = async (url, options = {}) => {
  try {
    const { format = 'png', ...otherOptions } = options;
    const mergedOptions = {
      ...DEFAULT_OPTIONS,
      ...otherOptions,
    };

    if (format === 'svg') {
      // Generate SVG
      const svgString = await QRCode.toString(url, {
        errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
        margin: mergedOptions.margin,
        color: mergedOptions.color,
        type: 'svg'
      });
      
      // Create data URL for SVG using UTF-8 encoding
      const svgDataURL = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
      
      return {
        data: svgString,
        dataURL: svgDataURL
      };
    } else {
      // Generate PNG
      const pngOptions = {
        errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
        margin: mergedOptions.margin,
        color: mergedOptions.color,
        width: mergedOptions.width,
        type: 'png'
      };

      const [data, dataURL] = await Promise.all([
        QRCode.toBuffer(url, pngOptions),
        QRCode.toDataURL(url, pngOptions)
      ]);

      return {
        data,
        dataURL
      };
    }
  } catch (error) {
    throw new Error(`QR code generation failed: ${error.message}`);
  }
};

/**
 * Generates a customized QR code with branding
 * @param {string} url - The URL to encode
 * @param {Object} brandingOptions - Branding customization options
 * @returns {Promise<string>} Base64 data URL of the branded QR code
 * @example
 * const brandedQR = await generateBrandedQRCode('https://snapurl.dev/abc123', {
 *   primaryColor: '#3B82F6',
 *   backgroundColor: '#F8FAFC',
 *   size: 512
 * });
 */
export const generateBrandedQRCode = async (url, brandingOptions = {}) => {
  const {
    primaryColor = "#3B82F6", // Blue primary color
    backgroundColor = "#F8FAFC", // Light gray background
    size = 256,
    errorCorrection = "M",
    logoUrl = null, // Future: embed logo in center
  } = brandingOptions;

  try {
    const options = {
      errorCorrectionLevel: errorCorrection,
      type: "image/png",
      quality: 0.92,
      margin: 2,
      color: {
        dark: primaryColor,
        light: backgroundColor,
      },
      width: size,
    };

    const qrCodeDataURL = await QRCode.toDataURL(url, options);
    return qrCodeDataURL;
  } catch (error) {
    throw new Error(`Branded QR code generation failed: ${error.message}`);
  }
};

/**
 * Generates multiple QR codes with different sizes
 * Useful for providing multiple resolution options
 * @param {string} url - The URL to encode
 * @param {number[]} sizes - Array of sizes in pixels
 * @param {Object} options - Base options for all QR codes
 * @returns {Promise<Object>} Object with size as key and QR code data URL as value
 * @example
 * const multiSize = await generateMultiSizeQRCodes('https://snapurl.dev/abc123', [128, 256, 512]);
 * // Returns: { "128": "data:image/png;base64...", "256": "data:image/png;base64...", "512": "data:image/png;base64..." }
 */
export const generateMultiSizeQRCodes = async (
  url,
  sizes = [128, 256, 512],
  options = {}
) => {
  try {
    const qrCodes = {};

    const generatePromises = sizes.map(async (size) => {
      const sizeOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
        width: size,
      };

      const qrCode = await QRCode.toDataURL(url, sizeOptions);
      return { size, qrCode };
    });

    const results = await Promise.all(generatePromises);

    results.forEach(({ size, qrCode }) => {
      qrCodes[size.toString()] = qrCode;
    });

    return qrCodes;
  } catch (error) {
    throw new Error(`Multi-size QR code generation failed: ${error.message}`);
  }
};

/**
 * Validates URL before QR code generation
 * Ensures the URL is valid and safe for QR code generation
 */
export const validateUrlForQR = (url) => {
  const errors = [];

  if (!url) {
    errors.push("URL is required");
    return { isValid: false, errors };
  }

  if (typeof url !== "string") {
    errors.push("URL must be a string");
    return { isValid: false, errors };
  }

  // Check URL length (QR codes have capacity limits)
  if (url.length > 2048) {
    errors.push("URL is too long for QR code (max 2048 characters)");
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    errors.push("Invalid URL format");
  }

  // Check for potentially problematic characters
  const problematicChars = /[^\x20-\x7E]/g; // Non-printable ASCII
  if (problematicChars.test(url)) {
    errors.push("URL contains non-printable characters that may cause issues");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Gets recommended QR code settings based on use case
 * @param {string} useCase - The intended use case ('web', 'print', 'mobile', 'business-card')
 * @returns {Object} Recommended QR code options
 * @example
 * const settings = getRecommendedSettings('print');
 * // Returns: { width: 512, errorCorrectionLevel: 'H', margin: 4, ... }
 */
export const getRecommendedSettings = (useCase) => {
  const recommendations = {
    web: {
      width: 256,
      errorCorrectionLevel: "M",
      margin: 1,
      quality: 0.92,
    },
    print: {
      width: 512,
      errorCorrectionLevel: "H", // High error correction for print
      margin: 4,
      quality: 1.0,
    },
    mobile: {
      width: 200,
      errorCorrectionLevel: "L", // Low for faster scanning
      margin: 1,
      quality: 0.85,
    },
    "business-card": {
      width: 300,
      errorCorrectionLevel: "H",
      margin: 2,
      quality: 1.0,
    },
  };

  return recommendations[useCase] || recommendations.web;
};

/**
 * Estimates QR code data capacity for given options
 * Helps determine if URL will fit in QR code
 * @param {string} errorCorrectionLevel - Error correction level ('L', 'M', 'Q', 'H')
 * @returns {Object} Capacity information
 * @example
 * const capacity = estimateQRCapacity('M');
 * // Returns: { alphanumeric: 1852, numeric: 2953, binary: 1273 }
 */
export const estimateQRCapacity = (errorCorrectionLevel = "M") => {
  // Approximate capacities for version 40 QR code (largest)
  const capacities = {
    L: { alphanumeric: 4296, numeric: 7089, binary: 2953 },
    M: { alphanumeric: 3391, numeric: 5596, binary: 2331 },
    Q: { alphanumeric: 2420, numeric: 3993, binary: 1663 },
    H: { alphanumeric: 1852, numeric: 3057, binary: 1273 },
  };

  return capacities[errorCorrectionLevel] || capacities.M;
};
