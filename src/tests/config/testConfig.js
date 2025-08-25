export const testConfig = {
  mongodb: {
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: "test-jwt-secret-key",
    expiresIn: "7d",
  },
  rateLimits: {
    disabled: true,
  },
};
