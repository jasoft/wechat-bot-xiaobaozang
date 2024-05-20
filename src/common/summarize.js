"use strict"
import dotenv from "dotenv"
import Groq from "groq-sdk"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
dotenv.config() // Load environment variables

class Summarizer {
	constructor() {
		this.groq = new Groq(process.env.GROQ_API_KEY)
	}
	async summarizeContentByTopicId() {
		try {
			const messages = await prisma.message.findMany({
				select: {
					id: true,
					topicId: true,
					isRoom: true,
					role: true,
					roomName: true,
					name: true,
					alias: true,
					content: true,
					createdAt: true,
				},
				where: {
					role: "user",
				},
			})

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
				const { alias, createdAt } = message
				const timeString = createdAt.toLocaleString("zh-CN")
				return `${alias} 在 ${timeString} 说: ${message.content}\n`
			}
			// 输出每个 topicId 下的 content 总结
			for (const topicId in messagesByTopic) {
				console.log("以下是话题内容", topicId)
				const chatContents = messagesByTopic[topicId]

				const contentAllText = chatContents.map(formatMessage).join("")

				const responseText = await this.getSummary(contentAllText)

				// 根据 topic保存到数据库, role 设置为 summary, content 为 responseText
				await prisma.message.deleteMany({
					where: { topicId: topicId, role: "summary" },
				})
				const summary = await prisma.message.create({
					data: {
						topicId,
						isRoom: chatContents[0].isRoom,
						role: "summary",
						content: responseText,
						name: "summary",
						roomName: chatContents[0].roomName,
						alias: "summary",
						createdAt: new Date(),
					},
				})
				console.log("保存成功:", summary)
			}
		} catch (error) {
			console.error("Error summarizing content by topic ID:", error)
		} finally {
			await prisma.$disconnect()
		}
	}

	async getSummary(contentSummary) {
		const chatCompletion = await this.groq.chat.completions.create({
			messages: [
				{
					role: "user",
					content:
						"用中文总结这段对话,记住说话的日期,直接输出内容,不需要说以下是总结之类的话:" + contentSummary,
				},
			],
			model: "llama3-70b-8192",
			temperature: 1,
			max_tokens: 8192,
			top_p: 1,
			stream: false,
			stop: null,
		})

		// Print the completion returned by the LLM.
		const responseText = chatCompletion.choices[0]?.message?.content || ""
		return responseText
	}
}

export default Summarizer
