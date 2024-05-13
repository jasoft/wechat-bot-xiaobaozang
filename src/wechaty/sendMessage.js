import { botName, roomWhiteList, aliasWhiteList, keywords, contextLimit } from '../../config.js'
import { getServe } from './serve.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function buildPrompt(context, question) {
  const contexts = context
    .map((message) => {
      return { role: message.role, content: `我是${message.alias},${message.content}` }
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
export async function defaultMessage(msg, bot, ServiceType = 'GPT') {
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
  const content = msg.text() ? msg.text() : isImage ? '[图片消息]' : '[其他消息]'
  const isRoom =
    roomWhiteList.includes(roomName) && (content.includes(`${botName}`) || isImage || keywords.some((keyword) => content.includes(keyword))) // 是否在群聊白名单内并且艾特了机器人或聊天触发了关键字
  const isAlias = aliasWhiteList.includes(remarkName) || aliasWhiteList.includes(name) // 发消息的人是否在联系人白名单内
  const cleanedBotName = botName.replace('@', '')
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
  console.log('message data', data)

  if (isBotSelf) return // 如果是机器人自己发送的消息或者消息类型不是文本则不处理

  try {
    // 区分群聊和私聊

    if (isRoom && room) {
      const question = (await msg.mentionText()) || content.replace(`${botName}`, '') // 去掉艾特的消息主体
      await handleChat(true, room.id, question)
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
    let response = ''

    const buildMessages = async () => {
      // 如果是图片或者语音消息，保存文件
      let convertedMessage = content
      if (isImage || isVoice) {
        const fileBox = await msg.toFileBox()
        console.log('fileBox', fileBox)
        const fileName = `./assets/${fileBox.name}`
        console.log('saving file to', fileName)
        await fileBox.toFile(fileName, true)

        convertedMessage = isImage ? `[图片消息]{${fileName}}` : `[语音消息]{${fileName}}`
      }

      await persistMessage('user', convertedMessage, name, alias)
      // 如果是文本消息，获取历史消息

      if (isText || isVoice) {
        return await getHistoryMessages(chatId, contextLimit)
      } else if (isImage) {
        return [{ role: 'user', alias: alias, content: convertedMessage }]
      } else {
        return []
      }
    }
    const messages = await buildMessages()
    //无法处理的消息返回,不回应
    if (messages.length == 0) {
      return
    }
    const question = await buildPrompt(messages, questionContent)
    response = await getReply(question)
    console.log('response', response)

    // 保存bot发的消息
    await persistMessage('assistant', response.toString(), botName, botName)
    if (isRoom) {
      await room.say(response)
    } else {
      await contact.say(response)
    }

    console.log(isRoom ? 'room response' : 'contact response', response)
  }

  async function persistMessage(role, content, name, alias) {
    console.log('persisting message', role, content, name, alias)
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
        createdAt: 'desc',
      },
    })
  }
}

/**
 * 分片消息发送
 * @param message
 * @param bot
 * @returns {Promise<void>}
 */
export async function shardingMessage(message, bot) {
  const talker = message.talker()
  const isText = message.type() === bot.Message.Type.Text // 消息类型是否为文本
  if (talker.self() || message.type() > 10 || (talker.name() === '微信团队' && isText)) {
    return
  }
  const text = message.text()
  const room = message.room()
  if (!room) {
    console.log(`Chat GPT Enabled User: ${talker.name()}`)
    const response = await getChatGPTReply(text)
    await trySay(talker, response)
    return
  }
  let realText = splitMessage(text)
  // 如果是群聊但不是指定艾特人那么就不进行发送消息
  if (text.indexOf(`${botName}`) === -1) {
    return
  }
  realText = text.replace(`${botName}`, '')
  const topic = await room.topic()
  const response = await getChatGPTReply(realText)
  const result = `${realText}\n ---------------- \n ${response}`
  await trySay(room, result)
}

// 分片长度
const SINGLE_MESSAGE_MAX_SIZE = 500

/**
 * 发送
 * @param talker 发送哪个  room为群聊类 text为单人
 * @param msg
 * @returns {Promise<void>}
 */
async function trySay(talker, msg) {
  const messages = []
  let message = msg
  while (message.length > SINGLE_MESSAGE_MAX_SIZE) {
    messages.push(message.slice(0, SINGLE_MESSAGE_MAX_SIZE))
    message = message.slice(SINGLE_MESSAGE_MAX_SIZE)
  }
  messages.push(message)
  for (const msg of messages) {
    await talker.say(msg)
  }
}

/**
 * 分组消息
 * @param text
 * @returns {Promise<*>}
 */
async function splitMessage(text) {
  let realText = text
  const item = text.split('- - - - - - - - - - - - - - -')
  if (item.length > 1) {
    realText = item[item.length - 1]
  }
  return realText
}
