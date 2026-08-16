export default {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          transform: {
            react: {
              runtime: "automatic"
            }
          }
        }
      }
    ]
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^@/(.*)$": "<rootDir>/client/src/$1"
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/**/*.test.(ts|tsx|js|jsx)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"]
};
