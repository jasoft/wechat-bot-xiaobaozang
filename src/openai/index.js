import { AIReplyHandler } from "../common/AIReplyHandler.js"

export async function getOpenAiReply(topicId, systemPrompt, payload) {
	const env = { ...process.env }
	env.SYSTEM_PROMPT = systemPrompt
	env.TOPIC_ID = topicId
	const openaiReplyHandler = new AIReplyHandler(env)
	return openaiReplyHandler.getAIReply(payload)
}
