import { getOpenAiReply } from "../openai/index.js"
import { getKimiReply } from "../kimi/index.js"
import { getXunfeiReply } from "../xunfei/index.js"
import { getGroqReply } from "../groq/index.js"
import { getDifyReply } from "../dify/index.js"
/**
 * 获取ai服务
 * @param serviceType 服务类型 'GPT' | 'Kimi'
 * @returns {Promise<void>}
 */
export function getServe(serviceType) {
  switch (serviceType) {
    case "ChatGPT":
      return getOpenAiReply
    case "Dify":
      return getDifyReply
    case "Kimi":
      return getKimiReply
    case "Xunfei":
      return getXunfeiReply
    case "Groq":
      return getGroqReply
    default:
      return getOpenAiReply
  }
}
