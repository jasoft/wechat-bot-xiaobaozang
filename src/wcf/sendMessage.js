import { botName, roomWhiteList, aliasWhiteList, keywords, contextLimit } from "../../config.js"
import { getServe } from "./serve.js"
import path from "path"
import { PrismaClient } from "@prisma/client"
import logger from "../common/index.js"
import { colorize } from "json-colorizer"
import pkg from "@wcferry/core"
const { Message, Wcferry } = pkg
const prisma = new PrismaClient()

async function buildPrompt(context) {
	const contexts = context
		.map((message) => {
			if (message.role === "user") {
				return { role: message.role, content: `我是${message.alias},${message.content}` }
			} else if (message.role === "assistant") {
				return { role: message.role, content: `${message.content}` }
			}
		})
		.reverse()
	return contexts
}

/**
 * Adds two numbers.
 * @param {Message} msg  - The first number.
 * @param {Wcferry} bot - The second number.
 * @param {string} ServiceType - The second number.
 *
 */
const MSG_TYPE_TEXT = 1
const MSG_TYPE_IMAGE = 3
const MSG_TYPE_VOICE = 34

export async function defaultMessage(msg, bot, ServiceType = "GPT") {
	const getReply = getServe(ServiceType)
	const contactId = msg.sender // 发消息人
	const contact = bot.getContact(contactId) // 发消息人
	const roomId = msg.roomId // 是否是群消息
	const roomName = bot.getContact(roomId).remark || null // 群名称

	const alias = contact.remark ? contact.remark : contact.name // 发消息人昵称
	const remarkName = contact.remark // 备注名称
	const name = contact.name // 微信名称

	const isText = msg.type === MSG_TYPE_TEXT // 消息类型是否为文本
	const isImage = msg.type === MSG_TYPE_IMAGE // 消息类型是否为图片
	const isVoice = msg.type === MSG_TYPE_VOICE // 消息类型是否为语音
	const content = msg.content ? msg.content : "[其他消息]"
	const isRoom = roomWhiteList.includes(roomName) // 是否在群聊白名单内并且艾特了机器人或聊天触发了关键字
	const isAlias = aliasWhiteList.includes(remarkName) || aliasWhiteList.includes(name) // 发消息的人是否在联系人白名单内
	const cleanedBotName = botName.replace("@", "")
	const isBotSelf = cleanedBotName === remarkName || cleanedBotName === name
	const topicId = roomId ? roomId : contactId // 发消息人id或群id

	// TODO 你们可以根据自己的需求修改这里的逻辑
	const data = {
		msg: msg,
		alias: alias,
		name: name,
		content: content,
		msgtype: msg.type,
		remarkName: remarkName,
		isRoom: isRoom,
		isAlias: isAlias,
		isBotSelf: isBotSelf,
		isText: isText,
		isImage: isImage,
		isVoice: isVoice,
		roomName: roomName,
		topicId: topicId,
	}
	logger.debug("", "message data", colorize(data))

	if (isBotSelf) return // 如果是机器人自己发送的消息或者消息类型不是文本则不处理

	// 保存用户发的消息, 保存消息的时候会根据消息类型保存不同的内容
	const normalizedMessage = await normalizeMessage()
	await persistMessage("user", normalizedMessage, name, alias)

	try {
		// 区分群聊和私聊

		if (isRoom && room) {
			// 此处获取的历史消息包括了刚发的一条
			const historyMessages = await getHistoryMessages(room.id, contextLimit)
			const triggedByKeywords = historyMessages.some((message) => {
				const triggeredKeyword = keywords.find((keyword) => message.content.includes(keyword))
				if (triggeredKeyword) {
					logger.info("Triggered keyword:", triggeredKeyword)
					return true
				}
				return false
			})

			//historyMessages 是按照时间倒序排列的，所以取第二条
			const botInConversation = () => {
				const lastMessageIsBot = historyMessages.length > 1 ? historyMessages[1].role == "assistant" : false
				if (lastMessageIsBot) {
					const lastBotMessageTime = historyMessages[1].createdAt
					const timeSinceLastBotMessage = new Date() - lastBotMessageTime
					logger.info("Time since last bot message:", timeSinceLastBotMessage)
					if (timeSinceLastBotMessage < 1000 * 60 * 5) {
						logger.info("Last message is bot and within 5 minutes, we are still in a conversation, reply.")
						return true
					}
				}
				logger.info("Last message is bot:", lastMessageIsBot)
				return false
			}

			if (triggedByKeywords || isImage || isVoice || botInConversation) {
				//const question = (await msg.mentionText()) || content.replace(`${botName}`, "") // 去掉艾特的消息主体
				await handleChat(true, room.id)
			}
		}

		// 私人聊天，白名单内的直接发送
		if (isAlias && !roomId) {
			await handleChat(false, contact.id)
		}
	} catch (e) {
		console.error(e)
	} finally {
		await prisma.$disconnect()
	}

	// 处理群聊和私聊
	async function handleChat(isRoom, chatId) {
		const buildMessages = async () => {
			let chatHistory = await getHistoryMessages(chatId, contextLimit)

			if (isImage) {
				chatHistory = [{ role: "user", alias: alias, content: normalizedMessage }]
			} else if (isVoice) {
				chatHistory.push({ role: "user", alias: alias, content: normalizedMessage })
			}
			return chatHistory
			// 如果是文本消息，获取历史消息
		}

		const messages = await buildMessages()
		//无法处理的消息返回,不回应
		if (messages.length == 0) {
			return
		}
		// question like [{role: 'user', content: '你好吗'},{role: 'assistant', content: '我很好'}]
		const question = await buildPrompt(messages)
		const response = await getReply(question)

		let sayText = response.response
		if (isVoice) {
			//      sayText = `${alias}：${response.convertedMessage} \n - - - - - - - - - - - - - - - \n ${response.response}`
			await updateVoiceMsgToText()
		}

		// 保存bot发的消息
		await persistMessage("assistant", sayText, botName, botName)
		const tellerId = isRoom ? roomId : contactId

		bot.sendTxt(sayText, tellerId)

		logger.debug(isRoom ? "room response" : "contact response", response)

		async function updateVoiceMsgToText() {
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
						content: response.convertedMessage,
					},
				})
			}
		}
	}

	async function normalizeMessage() {
		let normalizedMessage = content
		// 如果是图片或者语音消息，保存文件
		const attachmentPath = path.join(process.cwd(), "public", "attachments")
		try {
			if (isVoice) {
				logger.info("voice message", msg.id)
				const fileName = await bot.getAudioMsg(msg.id, attachmentPath)
				normalizedMessage = `[语音消息]{${fileName}}`
			}
			if (isImage) {
				const fileName = await bot.downloadImage(msg.id, attachmentPath)
				normalizedMessage = `[图片消息]{${fileName}}`
			}
			// 保存用户发的消息
		} catch (error) {
			logger.error("下载语音/图片出错", error)
			normalizedMessage = "[其他消息][错误]下载语音/图片出错"
			// Handle the error here
		}

		return normalizedMessage
	}

	//TODO: 把语音消息转为文字保存, 以保留完整的上下文
	async function persistMessage(role, content, name, alias) {
		logger.info("persisting message", colorize({ role, content, name, alias }))
		await prisma.message.create({
			data: {
				content: content,
				topicId: topicId,
				roomName: roomName,
				name: name,
				alias: alias,
				role: role,
				isRoom: isRoom,
			},
		})
	}

	async function getHistoryMessages(id, nums) {
		return await prisma.message.findMany({
			where: {
				topicId: id,
			},
			take: nums,
			orderBy: {
				createdAt: "desc",
			},
		})
	}
}
