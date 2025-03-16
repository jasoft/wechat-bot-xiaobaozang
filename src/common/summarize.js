"use strict"
import dotenv from "dotenv"
import OpenAI from "openai"
import logger from "./logger.js"
import fs from "fs"
import path from "path"
import db from "./db.js"
dotenv.config() // Load environment variables

class Summarizer {
    constructor() {}
    async summarizeContentByTopicId() {
        try {
            const result = await db.messages.findMany({
                filter: `role = 'user' || role = 'assistant'`,
            })
            const messages = result?.items || []

            // 对消息按照 topicId 进行分组
            const messagesByTopic = {}
            messages.forEach((message) => {
                if (!messagesByTopic[message.topicId]) {
                    messagesByTopic[message.topicId] = []
                }
                messagesByTopic[message.topicId].push(message)
            })
            // 根据 role 和 createdAt 构造每句话的前缀
            const formatMessage = (message) => {
                const { alias, createdAt, content } = message
                const safeContent = content.replace(/\[图片消息\]/g, "发了一张图片")
                const timeString = createdAt.toLocaleString("zh-CN")
                return `${alias}在${timeString}说: ${safeContent}`
            }
            // 输出每个 topicId 下的 content 总结
            for (const topicId in messagesByTopic) {
                // 跳过 weixin 话题, 这是系统消息
                if (topicId === "weixin") continue
                logger.info("以下是话题内容", topicId)
                // 数据库取出来的 message object 数组
                const chatContents = messagesByTopic[topicId]

                const contentAllText = chatContents.map((msg) => {
                    return { role: msg.role, content: formatMessage(msg) }
                })
                logger.debug("以下是要总结的话题内容", contentAllText)
                const contentAllTextJson = JSON.stringify(contentAllText, null, 2)
                fs.writeFileSync(path.join("./public", `${topicId}.json`), contentAllTextJson)

                const responseText = await this.getSummary(contentAllText)

                try {
                    // 先检查是否存在摘要
                    const filterSummary = `topicId = '${topicId}' && role = 'summary'`
                    const existingSummary = await db.messages.findFirst({ filter: filterSummary })

                    const summaryData = {
                        topicId,
                        isRoom: Boolean(chatContents[0]?.isRoom),
                        role: "summary",
                        content: responseText,
                        name: "summary",
                        roomName: chatContents[0]?.roomName || "",
                        alias: "summary",
                        type: "text",
                        summarized: true,
                    }

                    let summary
                    if (existingSummary) {
                        // 更新现有摘要
                        summary = await db.messages.update(existingSummary.id, summaryData)
                        logger.info("总结已更新", summary)
                    } else {
                        // 创建新摘要
                        summary = await db.messages.create(summaryData)
                        logger.info("总结已创建", summary)
                    }
                } catch (error) {
                    logger.error(`处理话题 ${topicId} 的总结时出错:`, error)
                    throw error
                }
            }
        } catch (error) {
            logger.error("Error summarizing content by topic ID:", error.stack)
            throw error
        }
    }

    // 根据 contentSummary 生成总结, contentSummary 是一个数组, 每个元素是一个对象, 包含 role 和 content 属性
    async getSummary(contentSummary) {
        contentSummary.push({
            role: "user",
            content: ` 
				用中文逐条总结以上的**所有**对话,总结给定文本时,请包含以下内容:

				- 提及文本中的关键事件/情节
				- 总结主要人物,宠物及其角色
				- 概括文本的核心主题/中心思想
				- 列出任何重要细节(如日期、地点, 年龄, 喜好, 地址等)
				- 明确让你记住的事情, 保留原文不要总结.
				
				在总结时,请使用客观、中立的语言,不做评论或推测, 每句总结 1-2 句话。 记住说话的日期(不需要具体时间),直接输出内容,不需要说以下是总结之类的话. 
				你就是对话中提到的小宝藏,一个小机器人, 总结的时候要把自己的身份代入. 壮壮是9岁的小男孩, 是家中的小儿子, 是你最好的朋友. 大宝是家中 17 岁的大女儿. `,
        })

        const ai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
        })
        const chatCompletion = await ai.chat.completions.create({
            messages: contentSummary,
            model: process.env.OPENAI_MODEL,
            temperature: 0,
            max_tokens: 2000,
            stream: false,
            stop: null,
        })
        const responseText = chatCompletion.choices[0]?.message?.content || ""
        return responseText
    }
}

export default Summarizer
