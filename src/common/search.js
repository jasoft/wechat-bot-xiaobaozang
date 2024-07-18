import { PrismaClient } from "@prisma/client"
import logger from "../common/logger.js"
import { colorize } from "json-colorizer"
import { MeiliSearch } from "meilisearch"

const prisma = new PrismaClient()
const meilisearch = new MeiliSearch({
    host: process.env.MEILI_HOST,
    apiKey: process.env.MEILI_API_KEY,
})

export async function searchChatLog(topicId, query) {
    const searchResult = await meilisearch.index("chatlog").search(query, {
        filter: `topicId="${topicId}"`,
    })
    logger.debug("search result", colorize(searchResult))
    return searchResult
}
