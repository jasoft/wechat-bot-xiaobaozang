import { searchChatLog } from "../search.js" // 路径根据实际情况修改

describe("query_chatlog", () => {
	it("should return search results from the actual database", async () => {
		const topicId = "741124862@chatroom" //我的一家
		const query = "生日"

		const result = await searchChatLog(topicId, query)

		// 在这里，你需要知道预期的结果是什么
		const expectedSearchResult = [
			// ...你的预期结果...
		]

		expect(result.hits.length).toBeGreaterThan(0)
	})
})
