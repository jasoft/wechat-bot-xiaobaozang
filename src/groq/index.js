"use strict"
import dotenv from "dotenv"
import Groq from "groq-sdk"
import { AIReplyHandler } from "../common/AIReplyHandler.js"

dotenv.config() // Load environment variables

export class GroqReplyHandler extends AIReplyHandler {
	constructor() {
		super()
		this.groq = new Groq({
			apiKey: this.env.GROQ_API_KEY,
		})
	}

	async getResponse(parsedMessage) {
		const { orignalMessage, convertedMessage, payload } = parsedMessage
		const chatCompletion = await this.groq.chat.completions.create({
			messages: payload,
			model: "llama3-70b-8192",
			temperature: 1,
			max_tokens: 1024,
			top_p: 1,
			stream: false,
			stop: null,
		})

		// Print the completion returned by the LLM.
		const responseText = chatCompletion.choices[0]?.message?.content || ""
		return {
			orignalMessage: orignalMessage,
			convertedMessage: convertedMessage,
			response: responseText,
		}
	}
}

// Usage
const groqReplyHandler = new GroqReplyHandler()
export async function getGroqReply(inputVal) {
	return groqReplyHandler.getAIReply(inputVal)
}
