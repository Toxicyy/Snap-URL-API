export default {
  testEnvironment: "node",
  testMatch: ["**/src/tests/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.js"],
  testTimeout: 60000,
};
