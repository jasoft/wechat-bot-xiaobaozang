import jestPlugin from "eslint-plugin-jest"

export default [
	{
		ignores: ["node_modules/", "dist/"],
	},
	{
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: "module",
			globals: {
				// 全局变量
			},
		},
		plugins: {
			jest: jestPlugin,
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
		rules: {
			// 添加自定义规则
		},
	},
	{
		files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
		languageOptions: {
			globals: {
				// Jest 全局变量
				jest: "readonly",
				describe: "readonly",
				it: "readonly",
				test: "readonly",
				expect: "readonly",
				beforeEach: "readonly",
				afterEach: "readonly",
				beforeAll: "readonly",
				afterAll: "readonly",
			},
		},
		plugins: {
			jest: jestPlugin,
		},
		rules: {
			// 其他规则
		},
	},
	{
		files: ["**/*.test.js", "**/*.test.jsx", "**/*.test.ts", "**/*.test.tsx"],
		plugins: {
			jest: jestPlugin,
		},
		rules: {
			...jestPlugin.configs.recommended.rules, // 直接包含 Jest 插件的推荐规则
		},
	},
]
