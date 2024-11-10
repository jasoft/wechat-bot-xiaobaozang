module.exports = {
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  // 如果你使用的是 TypeScript，请加入以下配置
  // "transform": {
  //   "^.+\\.(js|jsx|ts|tsx)$": "babel-jest"
  // },
  testEnvironment: "node",
  transformIgnorePatterns: ["/node_modules/", "\\.pnp\\.[^\\/]+$"],
  testEnvironmentOptions: {
    environment: "node",
  },
  setupFiles: ["<rootDir>/jest.setup.js"],
}
