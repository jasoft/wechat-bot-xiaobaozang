import { CozeBot } from "../bot.js"
import dotenv from "dotenv"

dotenv.config()

describe("CozeBot", () => {
	let cozeBot

	beforeEach(() => {
		cozeBot = new CozeBot()
	})

	afterEach(() => {})

	it("should send a request to the Coze API and return the response", async () => {
		const payload = [{ role: "user", content: "你好, 明天天气怎么样", content_type: "text" }]

		const expectedResponse = [
			"天气",
			"weather",
			// ...expected response data...
		]

		const response = await cozeBot.sendRequest(payload)
		const responseText = response.messages.filter((message) => message.type === "answer")[0].content

		console.log(responseText)

		const hasKeyword = expectedResponse.some((keyword) => responseText.includes(keyword))

		expect(hasKeyword).toBe(true)
	}, 30000)
})
