import { CozeBot } from "../bot.js"
import axios from "axios"
import dotenv from "dotenv"

dotenv.config()

describe("CozeBot", () => {
	let cozeBot

	beforeEach(() => {
		cozeBot = new CozeBot()
	})

	afterEach(() => {})

	it("should send a request to the Coze API and return the response", async () => {
		const payload = [
			{ role: "user", content: "Hello" },
			{ role: "assistant", content: "How are you?" },
			{ role: "user", content: "I have a question, What is the weather like today?" },
		]

		const expectedResponse = [
			"天气",
			"weather",
			// ...expected response data...
		]

		const response = await cozeBot.sendRequest(payload)

		expect(axios).toHaveBeenCalledWith({
			method: "post",
			url: "https://api.coze.cn/open_api/v2/chat",
			headers: {
				Authorization: `Bearer ${cozeBot.env.COZE_API_KEY}`,
				"Content-Type": "application/json",
				Accept: "*/*",
				Host: "api.coze.cn",
				Connection: "keep-alive",
			},
			data: {
				conversation_id: cozeBot.env.TOPIC_ID,
				bot_id: cozeBot.env.COZE_BOT_ID,
				query: payload.at(-1).content,
				user: cozeBot.env.TOPIC_ID,
				chat_history: payload.slice(0, -1),
				stream: false,
			},
		})
		const hasKeyword = expectedResponse.some((keyword) => response.includes(keyword))

		expect(hasKeyword).toBe(true)
	})
})
