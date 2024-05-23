import { AIReplyHandler } from "../common/AIReplyHandler.js"
const openaiReplyHandler = new AIReplyHandler()
export async function getOpenAiReply(inputVal) {
	return openaiReplyHandler.getAIReply(inputVal)
}
