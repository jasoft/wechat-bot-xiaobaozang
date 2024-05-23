import OpenAI from "openai"
import dotenv from "dotenv"
import logger from "../common/logger.js"
dotenv.config()
import { wxclient } from "../common/wxmessage.js"
async function query_chatlog(query) {
	console.log("query_chatlog is called with", query)
	return "[错误]"
}
async function wechat_sendmessage(arg) {
	const { message, contactName } = arg
	console.log("wechat_sendmessage is called with", message, contactName)

	wxclient.start()
	try {
		const contactId = wxclient
			.getContacts()
			.find((item) => item.remark === contactName || item.name === contactName).id
		logger.debug("contactId", contactId)
		if (contactId) {
			wxclient.sendTxt(message, contactId)
			return "消息已经发送给 " + contactName + ", 你可以在微信里看到。"
		} else {
			return "没有找到联系人 " + contactName
		}
	} finally {
		wxclient.stop()
	}
}

export const tools = [
	{
		type: "function",
		function: {
			name: "query_chatlog",
			description: "关于宠物的聊天记录",
			parameters: {
				type: "object",
				properties: {
					event: {
						type: "string",
						description: "事件名称例如: 买房, 买车, 结婚, 爱好,纪念日, 生日或者宠物的名字",
					},
				},
				required: ["event"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "wechat_sendmessage",
			description: "发送微信消息",
			parameters: {
				type: "object",
				properties: {
					message: {
						type: "string",
						description: "消息内容",
					},
					contactName: {
						type: "string",
						description: "联系人名字",
					},
				},
				required: ["message", "contactName"],
			},
		},
	},
]

// 运行对话
class ToolCallRequest {
	constructor(openai, model, tools, availableFunctions) {
		this.openai = openai
		this.model = model
		this.tools = tools
		this.availableFunctions = availableFunctions
	}

	async queryWithTools() {
		const response = await this.openai.chat.completions.create({
			model: this.model,
			messages: this.payload,
			tools: tools,
			tool_choice: "auto",
			max_tokens: 4096,
		})
		//
		console.log("first response", response.choices[0].message)
		return response.choices[0].message
	}

	async getResponse(payload) {
		this.payload = payload
		const toolsCheckMessage = await this.queryWithTools()
		try {
			if (toolsCheckMessage.tool_calls) {
				return await this.processToolCalls(toolsCheckMessage)
			} else {
				throw new Error("No tool calls found in the response")
			}
		} catch (error) {
			return undefined
		}
	}

	/**
	 * 异步处理工具调用
	 *
	 * @param toolsCheckMessage 工具检查消息
	 * @returns 返回二次响应中的具体内容
	 * @throws 当工具调用返回错误时，抛出错误
	 */
	async processToolCalls(toolsCheckMessage) {
		// 将响应消息添加到payload数组中

		const payload = [...this.payload]
		payload.push(toolsCheckMessage)

		// 遍历所有的工具调用, 并获取工具调用的响应
		const toolcallResponse = await this.getToolCallsResponse(toolsCheckMessage.tool_calls)
		logger.debug("toolcallResponse", toolcallResponse)

		try {
			for (toolCall of toolcallResponse) {
				if (toolCall.content === "[错误]") {
					throw new Error("Tool call returned an error")
				}
				payload.push(toolCall)
			}

			// 打印当前的payload数组
			logger.info("toolcall payload", payload)

			// 把 toolcall 的响应发给模型,再次调用模型响应
			const secondResponse = await this.openai.chat.completions.create({
				model: this.model,
				messages: payload,
			})

			// 从二次响应中获取具体的内容，并返回
			const response = secondResponse.choices[0].message.content
			return response
		} catch (error) {
			// 处理错误，可以在这里进行日志记录等操作
			throw error // 可选：重新抛出错误，以便上层调用者能够捕获到
		}
	}

	async getToolCallsResponse(toolCalls) {
		const payload = []
		for (const toolCall of toolCalls) {
			// 获取工具调用的函数名
			const functionName = toolCall.function.name

			// 从可用函数列表中获取对应的函数
			const functionToCall = this.availableFunctions[functionName]

			// 解析工具调用的函数参数（JSON格式）
			const functionArgs = JSON.parse(toolCall.function.arguments)

			// 打印函数参数
			console.log(functionArgs)

			// 调用对应的函数，并等待其响应
			const functionResponse = await functionToCall(functionArgs)

			// 将工具调用的响应添加到payload数组中，包括工具调用ID、角色、函数名以及函数响应内容
			payload.push({
				tool_call_id: toolCall.id,
				role: "tool",
				name: functionName,
				content: functionResponse,
			})
		}
		return payload
	}
}

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	baseURL: process.env.OPENAI_ENDPOINT,
})
const availableFunctions = {
	query_chatlog: query_chatlog,
	wechat_sendmessage: wechat_sendmessage,
}
export const toolCall = new ToolCallRequest(openai, process.env.OPENAI_MODEL, tools, availableFunctions)
// toolCall
// 	.getResponse()
// 	.then((response) => {
// 		console.log(response)
// 	})
// 	.catch((error) => {
// 		console.error(error)
// 	})
