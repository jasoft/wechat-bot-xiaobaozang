import { OpenAIBot } from "../common/openaiBot.js"
import axios from "axios"

export class CozeBot extends OpenAIBot {
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
			response: this.sendRequest(payload),
		}
	}

	async sendRequest(payload) {
		const query = payload.at(-1).content
		const chatHistory = payload.slice(0, -1)
		const data = {
			conversation_id: this.env.TOPIC_ID || "",
			bot_id: this.env.COZE_BOT_ID,
			query: query,
			user: this.env.TOPIC_ID || "user",
			chat_history: chatHistory,
			stream: false,
		}

		const config = {
			method: "post",
			url: "https://api.coze.cn/open_api/v2/chat",
			headers: {
				Authorization: `Bearer ${this.env.COZE_API_KEY}`,
				"Content-Type": "application/json",
			},
			data: data,
		}

		const response = await axios(config)
		return response.data
	}
}
