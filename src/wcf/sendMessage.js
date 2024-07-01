"use strict"
import { aliasWhiteList, botName, contextLimit, keywords, roomWhiteList } from "../../config.js"
import { getServe } from "./serve.js"
import path from "path"
import { PrismaClient } from "@prisma/client"
import logger from "../common/logger.js"
import { colorize } from "json-colorizer"
import { Message, Wcferry } from "@wcferry/core"
import { formatDistanceToNow } from "date-fns"
import StateMachine from "javascript-state-machine"
import { extractLastConversation } from "./conversation.js"

const prisma = new PrismaClient()
const mutedTopics = new Set()

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
		this.alias = this.contact.remark || this.contact.name
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
	getType(type_id) {
		switch (type_id) {
			case this.MSG_TYPE_TEXT:
				return "文本"
			case this.MSG_TYPE_IMAGE:
				return "图片"
			case this.MSG_TYPE_VOICE:
				return "语音"
			default:
				return "其他"
		}
	}
	async handle() {
		//logger.debug("", "message data", colorize(this))

		if (this.isBotSelf) return // If the bot sent the message, ignore it

		const normalizedMessage = await this.normalizeMessage()
		await this.saveMessageToDatabase("user", normalizedMessage, this.name, this.alias, this.getType(this.msg.type))

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

	async createMuteStateMachine() {
		const botMuted = mutedTopics.has(this.roomId)

		const botStateMachine = new StateMachine({
			init: botMuted ? "muted" : "unmuted",
			transitions: [
				{ name: "mute", from: "unmuted", to: "muted" },
				{ name: "unmute", from: "muted", to: "unmuted" },
			],
			methods: {
				onMute: () => {
					this.bot.sendTxt("小宝藏已经被禁言 15 分钟， 呜呜呜", this.roomId)
					mutedTopics.add(this.roomId)
					setTimeout(
						() => {
							botStateMachine.unmute()
						},
						15 * 60 * 1000
					)
				},
				onUnmute: () => {
					this.bot.sendTxt("小宝藏可以说话啦！", this.roomId)
					mutedTopics.delete(this.roomId)
				},
			},
		})

		return botStateMachine
	}

	/**
	 * 处理群消息, 判断是否需要触发对话, 触发对话则发送消息 (只有在群聊中触发关键词或者在群聊中与机器人对话时才会触发)
	 *
	 * @returns {Promise<void>} 无返回值
	 */
	async handleRoomMessage() {
		const botStateMachine = await this.createMuteStateMachine()
		const historyMessages = await this.getHistoryMessages(this.roomId, contextLimit)

		const lastConversation = extractLastConversation(historyMessages)
		const lastMessage = lastConversation.getLastMessage()
		logger.info("最后一条消息", lastMessage)

		const isMuteCommand = (message) => message.role === "user" && message.content.includes("不要说话")
		const isUnmuteCommand = (message) => message.role === "user" && message.content.includes("可以说话")
		if (isMuteCommand(lastMessage)) {
			botStateMachine.mute()
		}
		if (isUnmuteCommand(lastMessage)) {
			botStateMachine.unmute()
		}
		logger.info("bot state", botStateMachine.state)

		if (botStateMachine.state === "muted") {
			logger.info("小宝藏已经被禁言，不再回复消息。")
			return
		}

		const lastMessageContainsKeyword = keywords.some((keyword) => lastMessage.content.includes(keyword))

		// 检查是否是 5分钟内的消息，如果是然后检查 historyMessages 中是否有停止指令， 如果停止指令后没有出现 bot 消息，即 bot 没有被关键字唤醒，则不再回复
		// 如果是 5 分钟内的消息，且没有发现停止指令，则继续回复
		const botIsActive = () => {
			const timeSinceLastBotMessage =
				new Date() - new Date(lastConversation.getLastRoleMessage("assistant").createdAt)
			const firstUserMessage = lastConversation.getFirstRoleMessage("user")

			//对话是语音或者图片消息发起的，不回复
			if (["语音", "图片"].includes(firstUserMessage.type)) return false

			if (timeSinceLastBotMessage < 1000 * 60 * 5) {
				logger.info("5 分钟内机器人回复过消息，对话处于激活状态。")
				return true
			}

			return false
			// 从后向前遍历 historyMessages，查找最近的机器人消息
		}

		logger.info("检查是否应该回复群消息:", {
			lastMessageContainsKeyword,
			botInConversation: botIsActive(),
		})
		if (
			(lastMessageContainsKeyword && !isMuteCommand(lastMessage)) ||
			botIsActive() ||
			this.isImage ||
			this.isVoice
		) {
			logger.info(`触发群消息回复, 发送消息到群聊"${this.roomName}"`)
			await this.handleChat(true, this.roomId)
		}
	}

	/**
	 * 处理聊天消息, 获取历史消息, 构建对话上下文, 发送消息
	 *
	 * @param isRoom 是否是群聊
	 * @param chatId 聊天id
	 * @returns 无返回值
	 */
	async handleChat(isRoom, chatId) {
		const messages = await this.prepareMessagesForPrompt(chatId, isRoom)
		if (messages.length === 0) return

		const question = await this.buildPayload(messages)
		const response = await this.getReply(chatId, question, {
			name: this.alias,
		})
		logger.debug(isRoom ? "room response" : "contact response", colorize(response))
		let sayText = response.response

		if (this.isVoice) {
			await this.updateVoiceMsgToText(chatId, response.convertedMessage)
		}

		await this.saveMessageToDatabase("assistant", sayText, botName, botName, this.getType(this.MSG_TYPE_TEXT))
		this.bot.sendTxt(sayText, chatId)
	}

	async prepareMessagesForPrompt(chatId) {
		let chatHistory = await this.getHistoryMessages(chatId, contextLimit)

		if (this.isImage) {
			chatHistory = [
				{
					role: "user",
					alias: this.alias,
					content: await this.normalizeMessage(),
				},
			]
		} else if (this.isVoice) {
			chatHistory.push({
				role: "user",
				alias: this.alias,
				content: await this.normalizeMessage(),
			})
		}

		return chatHistory
	}

	async buildPayload(context) {
		return context.map((message, index, array) => {
			if (index === array.length - 1) {
				return { role: message.role, content: message.content }
			}

			const saySelfMessage = {
				role: message.role,
				content: `我是${message.alias}, 我的问题是: ${message.content}`,
			}

			if (message.role === "user") {
				if (this.isRoom) return saySelfMessage
				return { role: message.role, content: `${message.content}` }
			} else if (message.role === "assistant") {
				return {
					role: message.role,
					content: `${message.content}`,
				}
			}
			// } else if (message.role === "summary") {
			// 	return {
			// 		role: "user",
			// 		content: `以下是我们以前聊天的总结:${message.content}`,
			// 	}
			// }
		})
	}

	async normalizeMessage() {
		let normalizedMessage = this.content

		const attachmentPath = path.join(process.env.WCF_ROOT, "public", "attachments")

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

	async saveMessageToDatabase(role, content, name, alias, type) {
		if (content.startsWith("<")) {
			logger.warn("Ignoring message with HTML content", content)
			return
		}

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
				type: type,
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
	 * @returns <Promise> 返回一个Promise，resolve为历史消息数组，reject为错误信息
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
		return recentMessages.reverse()
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
