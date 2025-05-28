"use strict"
import { aliasWhiteList, botName, contextLimit, keywords, roomWhiteList } from "../../config.js"
import { getServe } from "./serve.js"
import path from "path"
import { PrismaClient } from "@prisma/client"
import rootlogger from "../common/logger.js"
import { colorize } from "json-colorizer"
import { Message, Wcferry } from "@zippybee/wechatcore"
import StateMachine from "javascript-state-machine"
import { extractLastConversation } from "../common/conversation.js"
import fs from "fs"

const prisma = new PrismaClient()
const mutedTopics = new Set()
const logger = rootlogger.getLogger("MessageHandler")

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
        this.MSG_TYPE_SYSTEM = 9999

        // 从消息中获取发送者的ID
        this.contactId = msg.sender
        // 检查消息是否由机器人自己发送
        this.isBotSelf = bot.getSelfWxid() == msg.sender
        // 根据发送者ID获取联系人信息，如不存在则使用空对象
        this.contact = this.isBotSelf ? bot.getContact(this.msg.roomId) : bot.getContact(this.contactId)
        // 获取群聊的ID（如果存在）
        this.roomId = msg.roomId
        // 如果存在群聊，则获取群聊名称；如果未能获取，则设置为 null
        this.roomName = this.roomId ? bot.getContact(this.roomId)?.name || null : null
        // 从联系人信息中获取备注名，如无则为空字符串
        this.remarkName = this.contact?.remark || ""
        // 获取联系人的名称，如果不存在则为空字符串
        this.name = this.contact?.name || ""
        // 确定用户别名：优先使用备注名，其次使用名称，若都不存在则默认为 "未知用户"
        this.alias = this.remarkName || this.name || "未知用户"

        // 判断消息是否为文本消息
        this.isText = msg.type === this.MSG_TYPE_TEXT
        // 判断消息是否为图片消息
        this.isImage = msg.type === this.MSG_TYPE_IMAGE
        // 判断消息是否为语音消息
        this.isVoice = msg.type === this.MSG_TYPE_VOICE
        // 设置消息内容，如果不存在则默认为 "[其他消息]"
        this.content = msg.content ? msg.content : "[其他消息]"
        // 根据房间白名单判断是否为群聊消息
        this.isRoom = roomWhiteList.includes(this.roomName)
        // 根据别名白名单判断是否为指定用户
        this.isAlias = aliasWhiteList.includes(this.remarkName) || aliasWhiteList.includes(this.name)
        // 设置话题ID，为群聊则使用 roomId，否则使用 contactId
        this.topicId = this.roomId ? this.roomId : this.contactId

        logger.debug("Message", this)
    }
    getType(type_id) {
        switch (type_id) {
            case this.MSG_TYPE_TEXT:
                return "文本"
            case this.MSG_TYPE_IMAGE:
                return "图片"
            case this.MSG_TYPE_VOICE:
                return "语音"
            case this.MSG_TYPE_SYSTEM:
                return "系统"
            default:
                return "其他"
        }
    }
    async handle() {
        //logger.debug("", "message data", colorize(this))

        if (this.isBotSelf) {
            logger.info("消息来自机器人自己")
            const botName = this.bot.getUserInfo().name
            this.saveMessageToDatabase("assistant", this.content, botName, botName, this.getType(this.msg.type))
            this.bot.sendTxt(this.content, this.roomId)
            return
        }
        const normalizedMessage = await this.convertMessageToTextRepresentation()
        const messageId = await this.saveMessageToDatabase(
            "user",
            normalizedMessage,
            this.name,
            this.alias,
            this.getType(this.msg.type)
        )
        let sayText = ""
        try {
            // 先把消息存入数据库,以备以后使用

            if (this.isRoom && this.roomId) {
                logger.info("处理群消息")
                sayText = await this.handleRoomMessage()
            }

            if (!this.isRoom) {
                logger.info("处理私聊消息")
                sayText = await this.handleChat(false, this.contactId)
            }
            await this.saveMessageToDatabase("assistant", sayText, botName, botName, "文本")
        } catch (e) {
            logger.error("处理消息出错", e)
            try {
                logger.info("Deleting failed message from database", messageId)
                await prisma.message.delete({
                    where: {
                        id: messageId,
                    },
                })
            } catch (dbErr) {
                logger.error("Failed to clean up error message from database", dbErr)
                // Continue with the original error
            }
            throw e
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
     * @returns {Promise<string>} 无返回值
     */
    async handleRoomMessage() {
        const botStateMachine = await this.createMuteStateMachine()
        const historyMessages = await this.getHistoryMessages(this.roomId, contextLimit)

        const lastConversation = extractLastConversation(historyMessages)
        logger.debug("last conversation", lastConversation.getMessages())
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
                new Date() - new Date(lastConversation.getLastRoleMessage("assistant")?.createdAt ?? 0)
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
            return await this.handleChat(true, this.roomId)
        }
    }

    /**
     * 处理聊天消息, 获取历史消息, 构建对话上下文, 发送消息
     *
     * @param isRoom 是否是群聊
     * @param chatId 聊天id
     * @returns {Promise<string>} 返回回复的消息内容
     */
    async handleChat(isRoom, chatId) {
        const messages = await this.prepareMessagesForPrompt(chatId, isRoom)
        // 这里的消息可能会包括语音或者图片文件的路径，类似于 `[图片消息]{图片路径}` 或 `[语音消息]{语音路径}`
        logger.debug("准备发送给 bot 的消息", colorize(messages))
        if (messages.length === 0) return

        const question = await this.buildPayload(messages)
        const response = await this.getReply(chatId, question, {
            name: this.alias,
        })

        logger.info("获取到的回复", response)

        logger.debug(isRoom ? "room response" : "contact response", colorize(response))
        let sayText = response.response

        if (this.isVoice || this.isImage) {
            await this.dbUpdateConvertedMsgToText(chatId, response.convertedMessage)
        }

        // 发送消息, 判断是否是图片消息

        if (response.type === "image") {
            this.bot.sendImage(Buffer.from(response.data, "base64"), chatId)
        } else {
            if (this.msg.type !== this.MSG_TYPE_SYSTEM) this.bot.sendTxt(sayText, chatId)
        }
        return sayText
    }

    /**
     * 为提示准备消息
     * 从数据库中获取历史消息，如果是图片或语音消息，则转换为文本消息
     **/
    async prepareMessagesForPrompt(chatId) {
        let chatHistory = await this.getHistoryMessages(chatId, contextLimit)

        if (this.isImage) {
            chatHistory.push({
                role: "user",
                alias: this.alias,
                content: await this.convertMessageToTextRepresentation(),
                //content: `这是一张图片，你暂时无法查看图片内容, 但你可以回答关于这张图片的问题`,
                createdAt: new Date(),
            })
        } else if (this.isVoice) {
            chatHistory.push({
                role: "user",
                alias: this.alias,
                content: await this.convertMessageToTextRepresentation(),
                createdAt: new Date(),
            })
        }

        return extractLastConversation(chatHistory).getMessages()
    }

    /**
     * 根据上下文消息构建用于发送到聊天服务的有效载荷。
     *
     * 此函数将消息对象数组转换为适合API使用的格式。
     * 它根据消息角色（用户、助手、摘要）和上下文进行不同处理：
     * - 对于群聊环境中的用户消息，会在前面加上用户的别名
     * - 对于数组中的最后一条消息，会保留原始格式
     * - 对于摘要消息，会将其转换为带有特定前缀的用户消息
     *
     * @param {Array<Object>} context - 要处理的消息对象数组
     * @param {string} context[].role - 消息发送者的角色（'user'、'assistant'或'summary'）
     * @param {string} context[].content - 消息内容
     * @param {string} [context[].alias] - 用户的别名/姓名（在群聊环境中使用）
     * @returns {Promise Array<Object>} 有效载荷数组
     */
    async buildPayload(context) {
        if (this.msg.type == this.MSG_TYPE_SYSTEM) {
            // For system messages, just take the most recent message
            return [{ role: context.at(-1).role, content: context.at(-1).content }]
        } // Close the if block

        let conversation = context.map((message, index, array) => {
            if (message.type == "系统") return {}
            if (index === array.length - 1) {
                return { role: message.role, content: message.content }
            }

            const saySelfMessage = {
                role: message.alias,
                content: `${message.content}`,
            }

            if (message.role === "user") {
                if (this.isRoom) return saySelfMessage
                return { role: message.role, content: `${message.content}` }
            } else if (message.role === "assistant") {
                if (this.isRoom) return saySelfMessage
                return {
                    role: message.role,
                    content: `${message.content}`,
                }
            } else if (message.role === "summary") {
                return {
                    role: "user",
                    content: `以下是我们以前聊天的总结:${message.content}`,
                }
            }
        })

        // If conversation array is not empty, proceed with adding system message
        if (conversation && conversation.length > 1) {
            if (this.isRoom)
                conversation.splice(0, 0, {
                    role: "system",
                    content:
                        "这是一个在微信群中的聊天记录, 你需要弄清楚人物关系并回答,最后是我说的话,你需要回答或者继续对话",
                })
            else
                conversation.splice(0, 0, {
                    role: "system",
                    content: "这是我和你的聊天记录, 最后是我说的话, 你需要回答或者继续对话",
                })
        }

        logger.debug("conversation", conversation)
        return conversation
    }

    /**
     * 标准化消息内容，将消息内容转换为文本表示形式
     * 如果消息是语音或图片消息，则下载并转换为文本表示形式
     * 如果消息是文本消息，则直接返回消息内容
     * 如果消息是其他类型的消息，则返回错误消息
     * @returns {Promise<string>} 标准化后的消息内容
     * @throws {Error} 如果下载语音或图片消息时出现错误
     * @throws {Error} 如果消息内容为空或为HTML内容
     */
    async convertMessageToTextRepresentation() {
        let textRepresentation = this.content

        const attachmentPath = path.join(process.env.WCF_ROOT, "public", "attachments")
        if (!fs.existsSync(attachmentPath)) {
            fs.mkdirSync(attachmentPath, { recursive: true })
        }

        try {
            if (this.isVoice) {
                logger.info("voice message", this.msg.id)

                logger.info("下载语音消息", attachmentPath, this.msg.id, this.msg.extra)
                const fileName = await this.bot.getAudioMsg(this.msg.id, attachmentPath, 10)

                textRepresentation = `[语音消息]{${fileName}}`
            }
            if (this.isImage) {
                logger.info("下载图片", attachmentPath, this.msg.id, this.msg.extra)
                const fileName = await this.bot.downloadImage(this.msg.id, attachmentPath, undefined, undefined, 5)

                textRepresentation = `[图片消息]{${fileName}}`
            }
        } catch (error) {
            logger.error("下载语音/图片出错", error, `filename=${fileName}`)
            textRepresentation = "[其他消息][错误]下载语音/图片出错"
        }

        return textRepresentation
    }

    async saveMessageToDatabase(role, content, name, alias, type) {
        if (!content || content.startsWith("<")) {
            logger.warn("Ignoring message with HTML content or blank", content)
            return null
        }

        logger.debug("Saving message to database", colorize({ role, content, name, alias }))
        const savedMessage = await prisma.message.create({
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
        logger.info("Message saved to database with ID:", savedMessage.id)
        return savedMessage.id
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
     * @returns {Promise<Array>} 历史消息列表, 按时间顺序排列（从过去到现在）
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
     * 将语音消息/图片消息等转换为文本并更新到数据库中
     *
     * @param chatId 聊天ID
     * @param convertedMessage 转换后的文本消息
     * @returns 无返回值
     */
    async dbUpdateConvertedMsgToText(chatId, convertedMessage) {
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

export async function processUserMessage(msg, bot, serviceType = "GPT") {
    const handler = new MessageHandler(msg, bot, serviceType)
    await handler.handle()
}
