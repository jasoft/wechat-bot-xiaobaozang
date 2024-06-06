import { OpenAIBot } from "../common/openaiBot.js"
import axios from "axios"
import logger from "../common/logger.js"
import process from "process"

export class DifyBot extends OpenAIBot {
	constructor(env = process.env) {
		super()
		this.env = env
		this.topicId = env.TOPIC_ID
	}

	async getResponse(parsedMessage) {
		const { originalMessage: originalMessage, convertedMessage, payload } = parsedMessage

		// Your code here
		return {
			originalMessage: originalMessage,
			convertedMessage: convertedMessage,
			response: await this.sendRequest(payload),
		}
	}

	async sendRequest(payload) {
		const lastMessage = payload[payload.length - 1]

		const query = `here is our talk history:\n'''\n${payload
			.slice(0, -1)
			.filter((message) => message.role !== "system")
			.map((message) => `${message.role}: ${message.content}`)
			.join("\n")}\n'''\n\nhere is my question:\n${lastMessage.content}`
		const data = {
			inputs: this.env.INPUT_ARGS || {},
			query: query,
			response_mode: "blocking",
			conversation_id: "",
			user: this.env.TOPIC_ID || "apiuser",
			auto_generate_name: false,
		}
		const url = `${this.env.DIFY_BASE_URL}/chat-messages`
		const headers = {
			Authorization: `Bearer ${this.env.DIFY_API_KEY}`,
			"Content-Type": "application/json",
		}
		try {
			logger.debug("dify bot sending request: ", data)
			const res = await axios.post(url, data, { headers })
			logger.debug("dify bot returned: ", res.data)
			return res.data.answer
		} catch (error) {
			logger.error("dify bot error: ", error.response.data)
			return "很抱歉，系统出现了错误，请稍候再尝试。"
		}

		//return response.data
	}
}
