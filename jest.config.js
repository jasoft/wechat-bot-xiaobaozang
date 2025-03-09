export default {
    transform: {
        "^.+\\.js$": "babel-jest",
    },
    testEnvironment: "node",
    transformIgnorePatterns: ["/node_modules/(?!(chalk|#ansi-styles|#supports-color))"],
    testEnvironmentOptions: {
        environment: "node",
    },
    setupFiles: ["<rootDir>/jest.setup.js"],
}
