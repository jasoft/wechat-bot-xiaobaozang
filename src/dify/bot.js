import { OpenAIBot } from "../common/openaiBot.js"
import axios from "axios"
import logger from "../common/logger.js"
import process from "process"
import MarkDown from "../common/markdown.js"
import { downloadAndConvertToBase64 } from "../common/helpers.js"

export class DifyBot extends OpenAIBot {
    constructor(env = process.env) {
        super()
        this.env = env
        this.topicId = env.TOPIC_ID
    }

    async getResponse(parsedMessage) {
        const { originalMessage: originalMessage, convertedMessage, payload } = parsedMessage

        const result = await this.sendRequest(payload)
        // Your code here
        if (result.includes("![image]")) {
            const imageUrl = `${process.env.DIFY_BASE_URL}${new MarkDown().extractImageLinks(result)[0]}`
            const base64Image = await downloadAndConvertToBase64(imageUrl)
            return {
                originalMessage: originalMessage,
                convertedMessage: convertedMessage,
                response: "这是您要的图片",
                data: base64Image,
                type: "image",
            }
        }

        return {
            originalMessage: originalMessage,
            convertedMessage: convertedMessage,
            response: result,
        }
    }

    async sendRequest(payload) {
        const lastMessage = payload[payload.length - 1]
        const systemMessage = payload.find((msg) => msg.role === "system")?.content || ""

        const query = `${systemMessage}:\n'''\n${payload
            .slice(0, -1)
            .filter((message) => message.role !== "system")
            .map((message) => `${message.role}: ${message.content}`)
            .join("\n")}\n'''\n\n现在我说:\n${lastMessage.content}`
        const data = {
            inputs: this.env.INPUT_ARGS || {},
            query: query,
            response_mode: "blocking",
            conversation_id: "",
            user: this.topicId || "apiuser",
            auto_generate_name: false,
        }
        const url = `${this.env.DIFY_BASE_URL}/v1/chat-messages`
        const headers = {
            Authorization: `Bearer ${this.env.DIFY_API_KEY}`,
            "Content-Type": "application/json",
        }
        try {
            logger.debug("dify bot sending request: ", data)
            const res = await axios.post(url, data, { headers })
            logger.debug("dify bot returned: ", res.data)

            return res.data.answer
        } catch (error) {
            logger.error("dify bot error: ", error.response.data)
            throw error
        }

        //return response.data
    }
}
