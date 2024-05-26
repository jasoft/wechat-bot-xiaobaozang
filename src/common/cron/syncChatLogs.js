import { PrismaClient } from "@prisma/client"
import logger from "../logger.js"
import { colorize } from "json-colorizer"
import { CHATLOG_INDEX } from "../topic.js"
import { MeiliSearch } from "meilisearch"
const prisma = new PrismaClient()

const meilisearch = new MeiliSearch({
	host: process.env.MEILI_HOST,
	apiKey: process.env.MEILI_API_KEY,
})
/**
 * 把数据库的聊天记录同步到Mellisearch中
 *
 * @returns 无返回值
 */
export async function syncChatLogs() {
	const chatlogs = await prisma.message.findMany({
		where: {},
	})
	await addDocuments(chatlogs)
}

async function addDocuments(prismaResult) {
	const index = meilisearch.index(CHATLOG_INDEX)
	logger.debug("index", colorize(index))
	if (index == undefined) {
		await meilisearch.createIndex(CHATLOG_INDEX, {
			primaryKey: "id",
		})
	}
	//build documents from chatlog, chatlog is not a valid document array
	const documents = prismaResult.map((chat, index) => ({
		id: index, // 使用数组索引作为id
		...chat, // 将聊天记录的其他属性复制到文档中
	}))

	return index.addDocuments(documents)
}
