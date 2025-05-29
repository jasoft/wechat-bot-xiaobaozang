module.exports = {
    transform: {
        "^.+\\.js$": "babel-jest",
    },
    testEnvironment: "node",
    transformIgnorePatterns: ["/node_modules/(?!(chalk|#ansi-styles|#supports-color))"],
    testEnvironmentOptions: {
        environment: "node",
    },
    setupFiles: ["<rootDir>/jest.setup.js"],
    moduleFileExtensions: ["js"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
}
