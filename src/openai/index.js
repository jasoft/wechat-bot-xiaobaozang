import { OpenAIBot } from "../common/openaiBot.js"
import { ChatTopic } from "../common/topic.js"

export async function getOpenAiReply(topicId, payload) {
	const env = { ...process.env }
	const topic = new ChatTopic(topicId)
	env.SYSTEM_PROMPT = await topic.getSystemPrompt()
	env.TOPIC_ID = topicId
	const openaiReplyHandler = new OpenAIBot(env)
	return openaiReplyHandler.getAIReply(payload)
}
