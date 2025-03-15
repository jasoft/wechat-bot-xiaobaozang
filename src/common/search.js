import logger from "../common/logger.js"
import { colorize } from "json-colorizer"
import { MeiliSearch } from "meilisearch"
import db from "./db.js"
const meilisearch = new MeiliSearch({
    host: process.env.MEILI_HOST,
    apiKey: process.env.MEILI_API_KEY,
})

export async function searchChatLog(topicId, query) {
    logger.debug("searchChatLog is called with", query)
    const result = await db.messages.findMany({
        filter: `topicId = '${topicId}'`,
    })
    const chatlog = result?.items || []
    const index = meilisearch.index("chatlog")
    logger.debug("index", colorize(index))
    if (index == undefined) {
        await meilisearch.createIndex("chatlog", {
            primaryKey: "id",
        })
    }
    //index.deleteAllDocuments()
    //build documents from chatlog, chatlog is not a valid document array
    const documents = chatlog.map((chat, index) => ({
        id: index, // 使用数组索引作为id
        ...chat, // 将聊天记录的其他属性复制到文档中
    }))

    const task = await meilisearch.index("chatlog").addDocuments(documents)
    logger.debug("task", colorize(task))
    await waitForTaskCompletion(task)
    logger.debug("documents indexed")

    const searchResult = await meilisearch.index("chatlog").search(query)
    logger.debug("search result", colorize(searchResult))
    return searchResult
}

async function waitForTaskCompletion(task) {
    while (task.status !== "succeeded") {
        if (task.status === "failed") {
            throw new Error(`Task ${taskUid} failed: ${task.error.message}`)
        }
        logger.info(`Waiting for task ${task.taskUid} to complete...`)
        await new Promise((resolve) => setTimeout(resolve, 100)) // 等待 100 毫秒后再检查
        task = await meilisearch.getTask(task.taskUid)
    }
}
