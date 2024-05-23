import axios from "axios"
import dotenv from "dotenv"
dotenv.config()

const apiUrl = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
const apiKey = process.env.OPENAI_API_KEY

const data = {
	model: "bailian-summary",
	input: {
		messages: [
			{
				role: "system",
				content: "You are a helpful assistant.",
			},
			{
				role: "user",
				content: "你好，哪个公园距离我最近？",
			},
		],
	},
	parameters: {},
}

const config = {
	headers: {
		Authorization: `Bearer ${apiKey}`,
		"Content-Type": "application/json",
		"X-DashScope-SSE": "enable",
	},
}

axios
	.post(apiUrl, data, config)
	.then((response) => {
		console.log(response.data)
	})
	.catch((error) => {
		console.error(error)
	})
