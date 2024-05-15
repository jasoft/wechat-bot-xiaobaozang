import { botName, roomWhiteList, aliasWhiteList, keywords, contextLimit } from "../../config.js"
import { getServe } from "./serve.js"
import { PrismaClient } from "@prisma/client"
import logger from "../common/index.js"
import { colorize } from "json-colorizer"
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
 * 默认消息发送
 * @param msg
 * @param bot
 * @param ServiceType 服务类型 'GPT' | 'Kimi'
 * @returns {Promise<void>}
 */
export async function defaultMessage(msg, bot, ServiceType = "GPT") {
	const getReply = getServe(ServiceType)
	const contact = msg.talker() // 发消息人
	const receiver = msg.to() // 消息接收人
	const room = msg.room() // 是否是群消息
	const roomName = (await room?.topic()) || null // 群名称
	const alias = (await contact.alias()) || (await contact.name()) // 发消息人昵称
	const remarkName = await contact.alias() // 备注名称
	const name = await contact.name() // 微信名称
	const isText = msg.type() === bot.Message.Type.Text // 消息类型是否为文本
	const isImage = msg.type() === bot.Message.Type.Image // 消息类型是否为图片
	const isVoice = msg.type() === bot.Message.Type.Audio // 消息类型是否为语音
	const content = msg.text() ? msg.text() : isImage ? "[图片消息]" : "[其他消息]"
	const isRoom = roomWhiteList.includes(roomName) // 是否在群聊白名单内并且艾特了机器人或聊天触发了关键字
	const isAlias = aliasWhiteList.includes(remarkName) || aliasWhiteList.includes(name) // 发消息的人是否在联系人白名单内
	const cleanedBotName = botName.replace("@", "")
	const isBotSelf = cleanedBotName === remarkName || cleanedBotName === name
	const topicId = room ? room.id : contact.id // 发消息人id或群id

	// TODO 你们可以根据自己的需求修改这里的逻辑
	const data = {
		msg: msg,
		alias: alias,
		name: name,
		content: content,
		msgtype: msg.type(),
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
	await persistMessage("user", await normalizeMessage(content), name, alias)

	try {
		// 区分群聊和私聊

		if (isRoom && room) {
			// 此处获取的历史消息包括了刚发的一条
			const historyMessages = await getHistoryMessages(room.id, contextLimit)
			const triggedByKeywords = historyMessages.some((message) => {
				const triggeredKeyword = keywords.find((keyword) => message.content.includes(keyword))
				if (triggeredKeyword) {
					logger.info("", "Triggered keyword:", triggeredKeyword)
					return true
				}
				return false
			})

			//historyMessages 是按照时间倒序排列的，所以取第二条
			const lastMessageIsBot = historyMessages.length > 1 ? historyMessages[1].role == "assistant" : false
			logger.info("", "Last message is bot:", lastMessageIsBot)
			if (triggedByKeywords || isImage || isVoice || lastMessageIsBot) {
				const question = (await msg.mentionText()) || content.replace(`${botName}`, "") // 去掉艾特的消息主体
				await handleChat(true, room.id, question)
			}
		}

		// 私人聊天，白名单内的直接发送
		if (isAlias && !room) {
			await handleChat(false, contact.id, content)
		}
	} catch (e) {
		console.error(e)
	} finally {
		await prisma.$disconnect()
	}

	// 处理群聊和私聊
	async function handleChat(isRoom, chatId, questionContent) {
		const buildMessages = async () => {
			let chatHistory = await getHistoryMessages(chatId, contextLimit)

			switch (msg.type()) {
				case bot.Message.Type.Image:
					chatHistory = [{ role: "user", alias: alias, content: normalizedMessage }]
					break
				case bot.Message.Type.Audio:
					chatHistory.push({ role: "user", alias: alias, content: normalizedMessage })
					break
				default:
					break
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
		const teller = isRoom ? room : contact
		teller.say(sayText)

		logger.debug(response, isRoom ? "room response" : "contact response")

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
	async function normalizeMessage(questionContent) {
		let normalizedMessage = questionContent
		// 如果是图片或者语音消息，保存文件
		if (isImage || isVoice) {
			const fileBox = await msg.toFileBox()
			const fileName = `./assets/${fileBox.name}`
			await fileBox.toFile(fileName, true)

			normalizedMessage = isImage ? `[图片消息]{${fileName}}` : `[语音消息]{${fileName}}`
		}
		// 保存用户发的消息

		return normalizedMessage
	}

	//TODO: 把语音消息转为文字保存, 以保留完整的上下文
	async function persistMessage(role, content, name, alias) {
		logger.info("", colorize({ role, content, name, alias }), "persisting message")
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
