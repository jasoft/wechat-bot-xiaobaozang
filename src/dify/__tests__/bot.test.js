import { DifyBot } from "../bot.js"
import dotenv from "dotenv"

dotenv.config()
describe("DifyBot", () => {
	let difyBot

	beforeEach(() => {
		difyBot = new DifyBot()
	})

	afterEach(() => {})

	it("测试天气状况", async () => {
		const payload = [{ role: "user", content: "你好, 明天天气怎么样" }]

		const expectedResponse = [
			"天气",
			"weather",
			// ...expected response data...
		]

		const response = await difyBot.sendRequest(payload)
		console.log(response)

		const hasKeyword = expectedResponse.some((keyword) => response.includes(keyword))

		expect(hasKeyword).toBe(true)
	}, 30000)

	it("读取知识库", async () => {
		const payload = [{ role: "user", content: "你好, 王子菡是谁" }]

		const expectedResponse = [
			"王子菡",
			// ...expected response data...
		]

		const response = await difyBot.sendRequest(payload)
		console.log(response)

		const hasKeyword = expectedResponse.some((keyword) => response.includes(keyword))

		expect(hasKeyword).toBe(true)
	}, 30000)
})
