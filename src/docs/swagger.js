/**
 * Swagger/OpenAPI Configuration for SnapURL API
 * Comprehensive API documentation with examples, schemas, and authentication
 */

export const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "SnapURL API",
    version: "1.0.0",
    description: `
# SnapURL - Professional URL Shortener API

A comprehensive URL shortening service with advanced analytics, QR code generation, and user management.

## Features

- 🔗 **URL Shortening**: Create short, memorable links with optional custom aliases
- 📊 **Advanced Analytics**: Detailed click tracking with geographic and device insights  
- 🔐 **User Management**: Full authentication with JWT tokens and API keys
- 📱 **QR Codes**: Automatic QR code generation with customization options
- ⚡ **Real-time Stats**: Live visitor tracking and performance metrics
- 🌍 **Geographic Data**: Country and city-level click analytics
- 🎯 **UTM Tracking**: Campaign tracking with UTM parameter support
- 📈 **Reporting**: Export analytics in JSON/CSV formats
- 🚀 **Rate Limiting**: Built-in protection against abuse
- 🔒 **Security**: Password-protected URLs and bot detection

## Quick Start

1. **Register**: Create an account with \`POST /api/auth/register\`
2. **Shorten URL**: Create your first short link with \`POST /api/urls\`
3. **Track Clicks**: Monitor performance with \`GET /api/analytics/dashboard\`

## Authentication

Most endpoints require authentication using JWT Bearer tokens:

\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

Get your token by logging in or registering.

## Rate Limits

- **Authentication**: 5 requests per 15 minutes
- **URL Creation**: 20 URLs per 15 minutes  
- **Analytics**: 50 requests per 15 minutes
- **Redirects**: 100 per minute

## Support

- **Documentation**: Full API docs available at \`/api-docs\`
- **Health Check**: Monitor API status at \`/health\`
- **GitHub**: [SnapURL Repository](https://github.com/snapurl/api)
`,
    contact: {
      name: "SnapURL Support",
      email: "support@snapurl.dev",
      url: "https://snapurl.dev/support",
    },
    license: {
      name: "MIT License",
      url: "https://opensource.org/licenses/MIT",
    },
    termsOfService: "https://snapurl.dev/terms",
  },

  servers: [
    {
      url: "http://localhost:5000",
      description: "Development server",
    },
    {
      url: "https://api.snapurl.dev",
      description: "Production server",
    },
    {
      url: "https://staging-api.snapurl.dev",
      description: "Staging server",
    },
  ],

  // Global security definitions
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtained from login or registration",
      },
      apiKeyAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API_KEY",
        description: "Long-lived API key for integrations",
      },
    },

    // Reusable response schemas
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          message: {
            type: "string",
            description: "Human-readable error message",
          },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string",
                  description: "Field that caused the error",
                },
                message: {
                  type: "string",
                  description: "Specific validation error",
                },
              },
            },
          },
          statusCode: {
            type: "number",
            description: "HTTP status code",
          },
        },
        required: ["success", "message"],
      },

      Success: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          message: {
            type: "string",
            description: "Success message",
          },
          data: {
            type: "object",
            description: "Response data",
          },
          meta: {
            type: "object",
            description: "Additional metadata",
          },
        },
        required: ["success", "message"],
      },

      PaginatedResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          message: {
            type: "string",
          },
          data: {
            type: "array",
            items: {
              type: "object",
            },
          },
          pagination: {
            type: "object",
            properties: {
              currentPage: {
                type: "integer",
                example: 1,
              },
              totalPages: {
                type: "integer",
                example: 10,
              },
              totalUrls: {
                type: "integer",
                example: 95,
              },
              hasNextPage: {
                type: "boolean",
                example: true,
              },
              hasPrevPage: {
                type: "boolean",
                example: false,
              },
            },
          },
        },
      },

      // Core entity schemas
      User: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            example: "64a1b2c3d4e5f6789abcdef0",
          },
          name: {
            type: "string",
            example: "John Doe",
          },
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          role: {
            type: "string",
            enum: ["user", "admin"],
            example: "user",
          },
          isActive: {
            type: "boolean",
            example: true,
          },
          urlCount: {
            type: "number",
            example: 15,
          },
          totalClicks: {
            type: "number",
            example: 342,
          },
          lastLogin: {
            type: "string",
            format: "date-time",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          preferences: {
            type: "object",
            properties: {
              defaultQRSize: {
                type: "number",
                enum: [128, 256, 512, 1024],
                example: 256,
              },
              defaultQRColor: {
                type: "string",
                pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
                example: "#000000",
              },
              emailNotifications: {
                type: "boolean",
                example: true,
              },
            },
          },
        },
      },

      URL: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            example: "64a1b2c3d4e5f6789abcdef1",
          },
          originalUrl: {
            type: "string",
            format: "uri",
            example: "https://example.com/very-long-url-with-many-parameters",
          },
          shortCode: {
            type: "string",
            example: "K3n9mP2",
          },
          customAlias: {
            type: "string",
            nullable: true,
            example: "myCustomLink",
          },
          title: {
            type: "string",
            nullable: true,
            example: "My Important Link",
          },
          description: {
            type: "string",
            nullable: true,
            example: "This is a description of what this link is about",
          },
          userId: {
            type: "string",
            nullable: true,
            example: "64a1b2c3d4e5f6789abcdef0",
          },
          isActive: {
            type: "boolean",
            example: true,
          },
          clickCount: {
            type: "number",
            example: 42,
          },
          uniqueClicks: {
            type: "number",
            example: 28,
          },
          lastClickedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          expiresAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          qrCode: {
            type: "object",
            nullable: true,
            properties: {
              dataUrl: {
                type: "string",
                description: "Base64 encoded QR code image",
              },
              size: {
                type: "number",
                example: 256,
              },
              generatedAt: {
                type: "string",
                format: "date-time",
              },
            },
          },
          metadata: {
            type: "object",
            properties: {
              domain: {
                type: "string",
                example: "example.com",
              },
              pageTitle: {
                type: "string",
                example: "Example Website - Home",
              },
              pageDescription: {
                type: "string",
                example: "Welcome to Example.com, the best example website",
              },
              favicon: {
                type: "string",
                format: "uri",
                example: "https://example.com/favicon.ico",
              },
              httpStatus: {
                type: "number",
                example: 200,
              },
              lastChecked: {
                type: "string",
                format: "date-time",
              },
            },
          },
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            example: ["work", "important"],
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
          shortUrl: {
            type: "string",
            format: "uri",
            example: "https://snapurl.dev/K3n9mP2",
            description: "Complete short URL (virtual field)",
          },
          clickThroughRate: {
            type: "number",
            example: 66.67,
            description: "Click-through rate percentage (virtual field)",
          },
          ageInDays: {
            type: "number",
            example: 15,
            description: "Age of URL in days (virtual field)",
          },
        },
      },

      Click: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            example: "64a1b2c3d4e5f6789abcdef2",
          },
          urlId: {
            type: "string",
            example: "64a1b2c3d4e5f6789abcdef1",
          },
          userId: {
            type: "string",
            nullable: true,
            example: "64a1b2c3d4e5f6789abcdef0",
          },
          ipAddress: {
            type: "string",
            example: "192.168.1.100",
          },
          userAgent: {
            type: "string",
            example:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          referrer: {
            type: "string",
            nullable: true,
            example: "https://google.com",
          },
          location: {
            type: "object",
            properties: {
              country: {
                type: "string",
                example: "US",
              },
              countryName: {
                type: "string",
                example: "United States",
              },
              region: {
                type: "string",
                example: "California",
              },
              city: {
                type: "string",
                example: "San Francisco",
              },
              timezone: {
                type: "string",
                example: "America/Los_Angeles",
              },
              coordinates: {
                type: "object",
                properties: {
                  latitude: {
                    type: "number",
                    example: 37.7749,
                  },
                  longitude: {
                    type: "number",
                    example: -122.4194,
                  },
                },
              },
            },
          },
          device: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["desktop", "mobile", "tablet", "bot", "unknown"],
                example: "desktop",
              },
              browser: {
                type: "string",
                example: "Chrome",
              },
              browserVersion: {
                type: "string",
                example: "91.0.4472.124",
              },
              os: {
                type: "string",
                example: "Windows",
              },
              osVersion: {
                type: "string",
                example: "10",
              },
              language: {
                type: "string",
                example: "en-US",
              },
            },
          },
          isBot: {
            type: "boolean",
            example: false,
          },
          isUnique: {
            type: "boolean",
            example: true,
          },
          campaign: {
            type: "object",
            nullable: true,
            properties: {
              source: {
                type: "string",
                example: "google",
              },
              medium: {
                type: "string",
                example: "cpc",
              },
              campaign: {
                type: "string",
                example: "spring_sale",
              },
              term: {
                type: "string",
                example: "url shortener",
              },
              content: {
                type: "string",
                example: "ad_variant_a",
              },
            },
          },
          clickedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
    },

    // Common parameters
    parameters: {
      PageParam: {
        in: "query",
        name: "page",
        schema: {
          type: "integer",
          minimum: 1,
          default: 1,
        },
        description: "Page number for pagination",
      },
      LimitParam: {
        in: "query",
        name: "limit",
        schema: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          default: 10,
        },
        description: "Number of items per page",
      },
      StartDateParam: {
        in: "query",
        name: "startDate",
        schema: {
          type: "string",
          format: "date",
        },
        description: "Start date for filtering (YYYY-MM-DD)",
      },
      EndDateParam: {
        in: "query",
        name: "endDate",
        schema: {
          type: "string",
          format: "date",
        },
        description: "End date for filtering (YYYY-MM-DD)",
      },
    },

    // Example responses
    examples: {
      UserExample: {
        summary: "Example user object",
        value: {
          _id: "64a1b2c3d4e5f6789abcdef0",
          name: "John Doe",
          email: "john@example.com",
          role: "user",
          isActive: true,
          urlCount: 15,
          totalClicks: 342,
          createdAt: "2023-07-03T10:30:00.000Z",
        },
      },
      UrlExample: {
        summary: "Example URL object",
        value: {
          _id: "64a1b2c3d4e5f6789abcdef1",
          originalUrl: "https://example.com/very-long-url",
          shortCode: "K3n9mP2",
          shortUrl: "https://snapurl.dev/K3n9mP2",
          title: "My Important Link",
          isActive: true,
          clickCount: 42,
          uniqueClicks: 28,
          createdAt: "2023-07-03T10:30:00.000Z",
        },
      },
      ErrorExample: {
        summary: "Example error response",
        value: {
          success: false,
          message: "Validation failed",
          errors: [
            {
              field: "originalUrl",
              message: "Please provide a valid URL (http:// or https://)",
            },
          ],
          statusCode: 400,
        },
      },
    },
  },

  // Global tags for organizing endpoints
  tags: [
    {
      name: "Authentication",
      description: "User registration, login, and account management",
      externalDocs: {
        description: "Auth Guide",
        url: "https://docs.snapurl.dev/auth",
      },
    },
    {
      name: "URLs",
      description: "URL shortening, management, and configuration",
      externalDocs: {
        description: "URL Management Guide",
        url: "https://docs.snapurl.dev/urls",
      },
    },
    {
      name: "Analytics",
      description: "Click tracking, statistics, and reporting",
      externalDocs: {
        description: "Analytics Guide",
        url: "https://docs.snapurl.dev/analytics",
      },
    },
    {
      name: "Redirects",
      description: "URL redirection and click tracking",
      externalDocs: {
        description: "Redirect Guide",
        url: "https://docs.snapurl.dev/redirects",
      },
    },
    {
      name: "QR Codes",
      description: "QR code generation and customization",
    },
    {
      name: "User Profile",
      description: "User profile and preference management",
    },
    {
      name: "API Keys",
      description: "API key generation for integrations",
    },
    {
      name: "Account Management",
      description: "Account settings and deactivation",
    },
  ],

  // External documentation
  externalDocs: {
    description: "Full Documentation",
    url: "https://docs.snapurl.dev",
  },
};

// Swagger options for jsdoc
export const swaggerOptions = {
  definition: swaggerDefinition,
  apis: ["./src/routes/*.js", "./src/models/*.js", "./src/controllers/*.js"],
};
