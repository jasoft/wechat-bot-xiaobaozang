import { AIReplyHandler } from "../common/AIReplyHandler.js"
import { ChatTopic } from "../common/topic.js"

export async function getOpenAiReply(topicId, payload) {
	const env = { ...process.env }
	const topic = new ChatTopic(topicId)
	env.SYSTEM_PROMPT = await topic.getSystemPrompt()
	env.TOPIC_ID = topicId
	const openaiReplyHandler = new AIReplyHandler(env)
	return openaiReplyHandler.getAIReply(payload)
}
