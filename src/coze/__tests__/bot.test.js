import {CozeBot} from "../bot.js"
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

		console.log(response)

		const hasKeyword = expectedResponse.some((keyword) => response.includes(keyword))

		expect(hasKeyword).toBe(true)
	})
})
