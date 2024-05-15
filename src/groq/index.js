"use strict"
import Groq from "groq-sdk"

import { handleImageMessage } from "../xunfei/xunfei.js"
import { handleVoiceMessage } from "../xunfei/xunfei.js"
import dotenv from "dotenv"
import { defineDmmfProperty } from "@prisma/client/runtime/library"
const env = dotenv.config().parsed // 环境参数
const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY,
})

export async function getGroqReply(inputVal) {
	let payloadText = [
		{
			role: "system",
			content: env.SYSTEM_PROMPT,
		},
	]
	payloadText.push(...inputVal)
	const lastUserMessage = payloadText[payloadText.length - 1]
	// Extracted method to handle image messages1

	// If the last message is an image message, call the image understanding API
	if (lastUserMessage.content.includes("[图片消息]")) {
		// 如果是图片直接返回识别结果,不参与对话
		const response = await handleImageMessage(lastUserMessage)
		return { orignalMessage: lastUserMessage.content, convertedMessage: response, response: response }
	}
	// 如果最后一条消息是语音消息，调用语音理解接口
	if (lastUserMessage.content.includes("[语音消息]")) {
		// 替换最后一条消息为语音识别结果
		payloadText.pop()
		payloadText.push({ role: "user", content: await handleVoiceMessage(lastUserMessage) })
	}

	const chatCompletion = await groq.chat.completions.create({
		messages: payloadText,
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
		orignalMessage: lastUserMessage.content,
		convertedMessage: payloadText[payloadText.length - 1].content,
		response: responseText,
	}
}
