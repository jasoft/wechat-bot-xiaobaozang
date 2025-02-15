import { PrismaClient } from "@prisma/client"
import logger from "../logger.js"
import { colorize } from "json-colorizer"
import { CHAT_LOG_INDEX } from "../topic.js"
import { MeiliSearch } from "meilisearch"

const prisma = new PrismaClient()

const meiliSearch = new MeiliSearch({
  host: process.env.MEILI_HOST,
  apiKey: process.env.MEILI_API_KEY,
})

/**
 * 把数据库的聊天记录同步到Mellisearch中
 *
 * @returns 无返回值
 */
export async function syncChatLogs() {
  try {
    const chatlogs = await prisma.message.findMany({
      where: {},
    })
    await addDocuments(chatlogs)
  } catch (error) {
    logger.error("Error in syncChatLogs", colorize(error))
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function addDocuments(prismaResult) {
  //await meiliSearch.deleteIndex(CHAT_LOG_INDEX)
  await meiliSearch.createIndex(CHAT_LOG_INDEX, { primaryKey: "id" })
  const index = meiliSearch.index(CHAT_LOG_INDEX)

  const documents = prismaResult.map((chat) => ({
    id: chat.id,
    ...chat,
  }))

  // 一个bug搞了一个小时,index.addDocuments(documents)返回的是一个task对象,而不是直接的结果,误以为await index.addDocuments(documents)会返回结果
  // 但是实际上是返回一个task对象,所以需要再次await index.waitForTask(task.taskUid)等待任务完成才会完全写入数据
  const task = await index.addDocuments(documents)
  // 等待任务完成
  await index.waitForTask(task.taskUid)
  return task
}
