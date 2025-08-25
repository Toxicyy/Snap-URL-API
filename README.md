# SnapURL API

A high-performance URL shortening service with advanced analytics and enterprise features.

## Features

### Core Functionality
- **URL Shortening**: Generate short URLs with custom aliases or auto-generated codes
- **QR Code Generation**: Customizable QR codes with size and color options
- **Analytics Engine**: Comprehensive tracking with geographic and device insights
- **User Management**: JWT authentication with API key support
- **Bulk Operations**: Create up to 100 URLs in a single request
- **Data Export**: JSON and CSV export with filtering options

### Advanced Analytics
- Real-time click tracking and statistics
- Geographic distribution with GeoIP integration
- Device and browser analytics
- Time-series data aggregation
- Platform-wide administrative insights
- Automated data retention management

### Security & Performance
- Multi-tier rate limiting
- Input validation and sanitization
- Password hashing with bcryptjs
- CORS and security headers
- Comprehensive error handling

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with refresh tokens
- **Testing**: Jest with 160+ tests
- **Documentation**: Swagger/OpenAPI 3.0
- **Deployment**: Docker containerized

## Quick Start

### Prerequisites
- Node.js 18 or higher
- MongoDB instance
- Environment variables configured

### Installation

```bash
# Clone the repository
git clone https://github.com/Toxicyy/Snap-URL-API.git
cd Snap-URL-API

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Docker Deployment

```bash
# Build image
docker build -t snapurl-api .

# Run container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=your_mongo_uri \
  -e JWT_SECRET=your_jwt_secret \
  snapurl-api
```

### Environment Variables

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/snapurl
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### API Documentation
Interactive API documentation is available at /api-docs when the server is running.

## Key Endpoints

- `POST /api/auth/register` - User registration  
- `POST /api/auth/login` - User authentication
- `POST /api/urls` - Create short URL
- `GET /api/urls` - List user URLs
- `GET /api/analytics/dashboard` - Analytics dashboard
- `GET /{shortCode}` - Redirect to original URL

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Generate coverage report
npm run test:coverage
```
### Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/         # Mongoose schemas
├── routes/         # API route definitions
├── services/       # Business logic
├── docs/           # Swagger documentation
└── tests/          # Test suites
    ├── unit/       # Unit tests
    ├── integration/# Integration tests
    └── e2e/        # End-to-end tests
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### License

This project is licensed under the MIT License.

### Health Check

The API provides a health check endpoint at `/health` for monitoring and deployment verification.

### Performance

- Handles concurrent requests with rate limiting
- MongoDB indexing for optimal query performance
- Docker containerization for consistent deployment
- Comprehensive error handling and logging
