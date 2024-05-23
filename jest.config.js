export default {
	transform: {
		"^.+\\.js$": "babel-jest",
	},
	// 如果你使用的是 TypeScript，请加入以下配置
	// "transform": {
	//   "^.+\\.(js|jsx|ts|tsx)$": "babel-jest"
	// },
	testEnvironment: "node",
}
