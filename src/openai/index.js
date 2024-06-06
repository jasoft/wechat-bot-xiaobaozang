import { OpenAIBot } from "../common/openaiBot.js"
import { ChatTopic } from "../common/topic.js"

export async function getOpenAiReply(topicId, payload, additionalArgs = {}) {
	const env = { ...process.env }
	const topic = new ChatTopic(topicId)
	env.SYSTEM_PROMPT = (await topic.getSystemPrompt()).replaceAll("{{name}}", additionalArgs.name || "用户")

	env.TOPIC_ID = topicId
	const openaiReplyHandler = new OpenAIBot(env)

	return openaiReplyHandler.getAIReply(payload)
}
