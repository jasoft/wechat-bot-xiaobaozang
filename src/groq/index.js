"use strict"
import { OpenAIBot } from "../common/openaiBot.js"

export async function getGroqReply(inputVal) {
	process.env.OPENAI_API_KEY = process.env.GROQ_API_KEY
	process.env.OPENAI_ENDPOINT = process.env.GROQ_ENDPOINT
	process.env.OPENAI_MODEL = process.env.GROQ_MODEL

	const groqReplyHandler = new OpenAIBot()
	return groqReplyHandler.getAIReply(inputVal)
}

//getGroqReply([{ role: "user", content: "你好" }]).then(console.log)
