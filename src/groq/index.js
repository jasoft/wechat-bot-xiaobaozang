"use strict"
import Groq from "groq-sdk"

import { getVoiceRecognitionText, getImageRecognitionText } from "../common/wxmessage.js"
import dotenv from "dotenv"

const env = dotenv.config().parsed // 环境参数
const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY,
})

async function parseMessage(payloadText) {
	const lastUserMessage = payloadText.at(-1)
	let result = {
		orignalMessage: lastUserMessage.content,
		convertedMessage: lastUserMessage.content,
		response: null,
		payload: payloadText,
	}
	// If the last parsedMessage is an image parsedMessage, call the image understanding API
	if (lastUserMessage.content.includes("[图片消息]")) {
		// 如果是图片直接返回识别结果,不参与对话
		const response = await getImageRecognitionText(lastUserMessage)
		result.convertedMessage = response
		result.response = response
	}
	// 如果最后一条消息是语音消息，调用语音理解接口
	else if (lastUserMessage.content.includes("[语音消息]")) {
		// 替换最后一条消息为语音识别结果
		const response = await getVoiceRecognitionText(lastUserMessage)
		const payload = [...payloadText]
		payload.pop()
		payload.push({ role: "user", content: response })
		result.convertedMessage = response
		result.payload = payload
	}
	// 如果错误,返回错误信息
	else if (lastUserMessage.content.includes("[错误]")) {
		result.response = "对不起，我无法理解你的意思，试试用文字吧"
	}

	// 如果是其他情况，则直接返回
	return result
}
export async function getGroqReply(inputVal) {
	const payloadText = [
		{
			role: "system",
			content: env.SYSTEM_PROMPT,
		},
	]
	payloadText.push(...inputVal)
	const parsedMessage = await parseMessage(payloadText)

	// 有返回了response,不需要提交给 ai 处理, 则直接返回
	if (parsedMessage.response) {
		return parsedMessage
	}

	// 需要 ai 处理消息
	return await getResponse(parsedMessage)
}
async function getResponse(parsedMessage) {
	const { orignalMessage, convertedMessage, payload } = parsedMessage
	const chatCompletion = await groq.chat.completions.create({
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
