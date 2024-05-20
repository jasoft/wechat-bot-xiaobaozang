"use strict"

import { getVoiceRecognitionText, getImageRecognitionText } from "./wxmessage.js"

export class AIReplyHandler {
	constructor() {
		this.env = process.env
	}

	async parseMessage(payloadText) {
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

	async getResponse(parsedMessage) {
		throw new Error("Not implemented, you should implement your own getResponse method")
	}

	async getAIReply(payload) {
		const payloadText = [
			{
				role: "system",
				content: this.env.SYSTEM_PROMPT,
			},
		]
		payloadText.push(...payload)
		const parsedMessage = await this.parseMessage(payloadText)

		// 有返回了response,不需要提交给 ai 处理, 则直接返回
		if (parsedMessage.response) {
			return parsedMessage
		}

		// 需要 ai 处理消息
		return await this.getResponse(parsedMessage)
	}
}
