import { PrismaClient } from "@prisma/client"
import { MeiliSearch } from "meilisearch"
import { syncChatLogs } from "../syncChatLogs"
import { CHAT_LOG_INDEX } from "../../topic"

const meiliSearch = new MeiliSearch({
  host: process.env.MEILI_HOST,
  apiKey: process.env.MEILI_API_KEY,
})

describe("syncChatLogs Integration Test", () => {
  test("成功同步聊天记录到Meilisearch", async () => {
    // 执行同步
    await syncChatLogs()

    // 验证数据是否同步成功
    const index = meiliSearch.index(CHAT_LOG_INDEX)
    console.log(index)
    const searchResults = await index.search("for")
    console.log(searchResults)

    expect(searchResults.hits.length).toBeGreaterThan(0)
  }, 10000) // 增加超时时间为10秒
})
