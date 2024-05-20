import { botName, roomWhiteList, aliasWhiteList, keywords, contextLimit } from "../../config.js"
import { getServe } from "./serve.js"
import path from "path"
import { PrismaClient } from "@prisma/client"
import logger from "../common/index.js"
import { colorize } from "json-colorizer"
import pkg from "@wcferry/core"
const { Message, Wcferry } = pkg
const prisma = new PrismaClient()

class MessageHandler {
	/**
	 * 构造函数
	 *
	 * @param {Message} msg 收到的微信消息对象
	 * @param {Wcferry} bot 微信机器人实例
	 * @param {string} serviceType 服务类型，默认为GPT
	 */
	constructor(msg, bot, serviceType = "GPT") {
		this.msg = msg
		this.bot = bot
		this.serviceType = serviceType
		this.getReply = getServe(serviceType)

		this.MSG_TYPE_TEXT = 1
		this.MSG_TYPE_IMAGE = 3
		this.MSG_TYPE_VOICE = 34

		this.contactId = msg.sender
		this.contact = bot.getContact(this.contactId)
		this.roomId = msg.roomId
		this.roomName = bot.getContact(this.roomId)?.name || null
		this.alias = this.contact.remark ? this.contact.remark : this.contact.name
		this.remarkName = this.contact.remark
		this.name = this.contact.name

		this.isText = msg.type === this.MSG_TYPE_TEXT
		this.isImage = msg.type === this.MSG_TYPE_IMAGE
		this.isVoice = msg.type === this.MSG_TYPE_VOICE
		this.content = msg.content ? msg.content : "[其他消息]"
		this.isRoom = roomWhiteList.includes(this.roomName)
		this.isAlias = aliasWhiteList.includes(this.remarkName) || aliasWhiteList.includes(this.name)
		const cleanedBotName = botName.replace("@", "")
		this.isBotSelf = cleanedBotName === this.remarkName || cleanedBotName === this.name
		this.topicId = this.roomId ? this.roomId : this.contactId
	}

	async handle() {
		logger.debug("", "message data", colorize(this))

		if (this.isBotSelf) return // If the bot sent the message, ignore it

		const normalizedMessage = await this.normalizeMessage()
		await this.saveMessageToDatabase("user", normalizedMessage, this.name, this.alias)

		try {
			if (this.isRoom && this.roomId) {
				await this.handleRoomMessage()
			}

			if (this.isAlias && !this.roomId) {
				await this.handleChat(false, this.contactId)
			}
		} catch (e) {
			logger.error("sendMessage", e.message)
			console.error(e)
		} finally {
			await prisma.$disconnect()
		}
	}

	/**
	 * 处理群消息, 判断是否需要触发对话, 触发对话则发送消息 (只有在群聊中触发关键词或者在群聊中与机器人对话时才会触发)
	 *
	 * @returns {Promise<void>} 无返回值
	 */
	async handleRoomMessage() {
		const historyMessages = await this.getHistoryMessages(this.roomId, contextLimit)
		const lastMessage = historyMessages.at(-1)
		const lastMessageContainsKeyword = keywords.some((keyword) => lastMessage.content.includes(keyword))

		const triggeredByKeywordsInHistory = historyMessages.some((message) => {
			return keywords.some((keyword) => message.content.includes(keyword))
		})

		const botInConversation = () => {
			const lastMessageIsBot = historyMessages.length > 1 ? historyMessages[1].role === "assistant" : false
			if (lastMessageIsBot) {
				const lastBotMessageTime = historyMessages[1].createdAt
				const timeSinceLastBotMessage = new Date() - lastBotMessageTime
				logger.info("Time since last bot message:", timeSinceLastBotMessage)
				if (timeSinceLastBotMessage < 1000 * 60 * 5 && triggeredByKeywordsInHistory) {
					logger.info("Last message is bot and within 5 minutes, history messages contain keyword, reply.")
					return true
				}
			}
			logger.info("Last message is bot:", lastMessageIsBot)
			return false
		}
		logger.info("检查是否应该回复群消息:", {
			lastMessageContainsKeyword,
			triggeredByKeywordsInHistory,
			botInConversation: botInConversation(),
		})
		if (lastMessageContainsKeyword || botInConversation() || this.isImage || this.isVoice) {
			await this.handleChat(true, this.roomId)
		}
	}

	/**
	 * 处理聊天消息
	 *
	 * @param isRoom 是否是群聊
	 * @param chatId 聊天id
	 * @returns 无返回值
	 */
	async handleChat(isRoom, chatId) {
		const messages = await this.prepareMessagesForPrompt(chatId, isRoom)
		if (messages.length === 0) return

		const question = await this.buildPrompt(messages)
		const response = await this.getReply(question)
		logger.debug(isRoom ? "room response" : "contact response", colorize(response))
		let sayText = response.response

		if (this.isVoice) {
			await this.updateVoiceMsgToText(chatId, response.convertedMessage)
		}

		await this.saveMessageToDatabase("assistant", sayText, botName, botName)
		this.bot.sendTxt(sayText, chatId)
	}

	async prepareMessagesForPrompt(chatId) {
		let chatHistory = await this.getHistoryMessages(chatId, contextLimit)

		if (this.isImage) {
			chatHistory = [{ role: "user", alias: this.alias, content: await this.normalizeMessage() }]
		} else if (this.isVoice) {
			chatHistory.push({ role: "user", alias: this.alias, content: await this.normalizeMessage() })
		}

		return chatHistory
	}

	async buildPrompt(context) {
		const contexts = context
			.map((message) => {
				if (message.role === "user") {
					return { role: message.role, content: `我是${message.alias},${message.content}` }
				} else if (message.role === "assistant") {
					return { role: message.role, content: `${message.content}` }
				} else if (message.role === "summary") {
					return { role: "user", content: `以下是我们以前聊天的总结:${message.content}` }
				}
			})
			.reverse()

		return contexts
	}

	async normalizeMessage() {
		let normalizedMessage = this.content
		const attachmentPath = path.join(process.cwd(), "public", "attachments")
		try {
			if (this.isVoice) {
				logger.info("voice message", this.msg.id)
				const fileName = await this.bot.getAudioMsg(this.msg.id, attachmentPath, 10)
				normalizedMessage = `[语音消息]{${fileName}}`
			}
			if (this.isImage) {
				const fileName = await this.bot.downloadImage(this.msg.id, attachmentPath, undefined, undefined, 10)
				normalizedMessage = `[图片消息]{${fileName}}`
			}
		} catch (error) {
			logger.error("下载语音/图片出错", error)
			normalizedMessage = "[其他消息][错误]下载语音/图片出错"
		}

		return normalizedMessage
	}

	async saveMessageToDatabase(role, content, name, alias) {
		logger.info("Saving message to database", colorize({ role, content, name, alias }))
		await prisma.message.create({
			data: {
				content: content,
				topicId: this.topicId,
				roomName: this.roomName,
				name: name,
				alias: alias,
				role: role,
				isRoom: this.isRoom,
			},
		})
	}

	async getSummaryByTopic(topicId) {
		return prisma.message.findFirst({
			where: {
				topicId: topicId,
				role: "summary",
			},
		})
	}
	/**
	 * 获取历史消息列表
	 *
	 * @param topicId 主题ID
	 * @param nums 获取的消息数量
	 * @returns 返回一个Promise，resolve为历史消息数组，reject为错误信息
	 */
	async getHistoryMessages(topicId, nums) {
		const recentMessages = await prisma.message.findMany({
			where: {
				topicId: topicId,
			},
			take: nums,
			orderBy: {
				createdAt: "desc",
			},
		})

		const summary = await this.getSummaryByTopic(topicId)
		if (summary) {
			recentMessages.push(summary)
		}
		return recentMessages
	}

	/**
	 * 将语音消息转换为文本并更新到数据库中
	 *
	 * @param chatId 聊天ID
	 * @param convertedMessage 转换后的文本消息
	 * @returns 无返回值
	 */
	async updateVoiceMsgToText(chatId, convertedMessage) {
		const lastMessage = await prisma.message.findFirst({
			where: {
				topicId: chatId,
			},
			orderBy: {
				createdAt: "desc",
			},
		})

		if (lastMessage) {
			await prisma.message.update({
				where: {
					id: lastMessage.id,
				},
				data: {
					content: convertedMessage,
				},
			})
		}
	}
}

export async function defaultMessage(msg, bot, serviceType = "GPT") {
	const handler = new MessageHandler(msg, bot, serviceType)
	await handler.handle()
}
