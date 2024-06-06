import dotenv from "dotenv"
dotenv.config()
process.env.LOG_LEVEL = "debug"
import { DifyBot } from "../bot.js"

describe("DifyBot", () => {
	let difyBot

	beforeEach(() => {
		const env = { ...process.env }
		env.INPUT_ARGS = { name: "魔鬼筋肉人" }
		process.env.LOG_LEVEL = "debug"
		difyBot = new DifyBot(env)
	})

	afterEach(async () => {}, 30000)

	// 辅助函数，用于发送请求并检查响应
	async function testBotResponse(payload, expectedResponseKeywords) {
		const response = await difyBot.sendRequest(payload)
		console.log(response)
		const hasKeyword = expectedResponseKeywords.some((keyword) => response.includes(keyword))
		return hasKeyword
	}

	it("问 bot天气状况会返回正确的信息", async () => {
		const payload = [
			{ role: "user", content: "你好, 你是谁" },
			{ role: "assistant", content: "你好,我是一个智能助手" },
			{ role: "user", content: "明天天气怎么样" },
		]

		const expectedResponseKeywords = [
			"天气",
			"weather",
			// ...expected response data...
		]

		expect(await testBotResponse(payload, expectedResponseKeywords)).toBe(true)
	}, 30000)

	it("读取知识库并返回知识库中的结果", async () => {
		const payload = [
			{ role: "user", content: "你好, 你是谁" },
			{ role: "assistant", content: "你好,我是一个智能助手" },
			{ role: "user", content: "王子菡是谁" },
		]

		const expectedResponseKeywords = [
			"王子菡",
			// ...expected response data...
		]

		expect(await testBotResponse(payload, expectedResponseKeywords)).toBe(true)
	}, 30000)

	it("变量传入应该有正确的回答", async () => {
		const payload = [
			{ role: "user", content: "你好, 你是谁" },
			{ role: "assistant", content: "你好,我是一个智能助手" },
			{ role: "user", content: "我是谁" },
		]

		const expectedResponseKeywords = [
			"魔鬼筋肉人",

			// ...expected response data...
		]

		expect(await testBotResponse(payload, expectedResponseKeywords)).toBe(true)
	}, 30000)

	it("可以发送微信给指定用户", async () => {
		const payload = [
			{ role: "user", content: "你好, 你是谁" },
			{ role: "assistant", content: "你好,我是一个智能助手" },
			{ role: "user", content: "发微信给爸爸,告诉他我现在在学校,没什么其他事了." },
		]

		const expectedResponseKeywords = [
			"成功",

			// ...expected response data...
		]

		expect(await testBotResponse(payload, expectedResponseKeywords)).toBe(true)
	}, 30000)
	it("发送微信出错会报错", async () => {
		const payload = [
			{ role: "user", content: "你好, 你是谁" },
			{ role: "assistant", content: "你好,我是一个智能助手" },
			{ role: "user", content: "发微信给不存在的人,告诉他我现在在学校,没什么其他事了." },
		]

		const expectedResponseKeywords = [
			"错误",
			"出错",

			// ...expected response data...
		]

		expect(await testBotResponse(payload, expectedResponseKeywords)).toBe(true)
	}, 30000)
})
