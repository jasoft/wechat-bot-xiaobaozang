/* eslint-disable jest/expect-expect */
/* eslint-disable jest/no-disabled-tests */

import { getDifyReply } from "../../dify/index.js"
import dotenv from "dotenv"
dotenv.config()

describe.skip("Summarizer", () => {
	beforeEach(() => {})

	it.skip("应该返回给定内容的摘要", async () => {
		// 模拟 AIReplyHandler 返回固定的响应
		// 在这里添加你的代码
	}, 30000)
})

describe("chatbot", () => {
	it("should return a greeting", async () => {
		const topicId = "741124862@chatroom" //我的一家
		const query = [
			{ role: "user", content: "你好, 你是谁" },
			{ role: "assistant", content: "你好,我是一个智能助手" },
			{ role: "user", content: "你是谁啊,说出你的名字" },
		]

		const result = await getDifyReply(topicId, query, { name: "魔鬼筋肉人" })
		console.log(result)

		expect(result.response).toContain("小宝藏")
	}, 30000)
})
