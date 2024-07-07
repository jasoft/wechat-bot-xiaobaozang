import { DifyBot } from "../dify/bot.js"

export async function getDifyReply(topicId, payload, additionalArgs = {}) {
	const env = { ...process.env }
	env.INPUT_ARGS = additionalArgs
	env.TOPIC_ID = topicId
	const bot = new DifyBot(env)

	return bot.getAIReply(payload)
}
