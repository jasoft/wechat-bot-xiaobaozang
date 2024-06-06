import { CozeBot } from "../bot.js"
import dotenv from "dotenv"

dotenv.config()

describe("CozeBot", () => {
	let cozeBot

	beforeEach(() => {
		cozeBot = new CozeBot()
	})

	afterEach(() => {})

	it("应该向 Coze API 发送请求并返回响应", async () => {
		const payload = [{ role: "user", content: "你好, 明天天气怎么样", content_type: "text" }]

		const expectedResponse = [
			"天气",
			"weather",
			"明天",
			"天气预报",
			// ...expected response data...
			"温度",
			"湿度",
			"风速",
		]

		const response = await cozeBot.sendRequest(payload)
		const responseText = response.messages.filter((message) => message.type === "answer")[0].content

		console.log(responseText)

		const hasKeyword = expectedResponse.some((keyword) => responseText.includes(keyword))

		expect(hasKeyword).toBe(true)
	}, 30000)
})
