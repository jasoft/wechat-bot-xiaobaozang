import OpenAI from "openai"
import dotenv from "dotenv"
import logger from "./logger.js"
dotenv.config()
import { wxclient } from "./wxmessage.js"
import { colorize } from "json-colorizer"
import { searchChatLog } from "./search.js"
async function query_chatlog(topicId, query) {
	logger.debug("query_chatlog is called with", query)
	const { event } = query
	const result = await searchChatLog(topicId, event)
	if (result.hits.length > 0) {
		const messages = result.hits.map((item) => {
			return `${item.alias}说: ${item.content} `
		})
		return messages.join("\n")
	}
	return "[错误]"
}
async function wechat_sendmessage(topicId, arg) {
	const { message, contactName } = arg
	if (!message || !contactName) {
		return "[错误]参数错误"
	}
	logger.debug("wechat_sendmessage is called with", message, contactName)

	try {
		const contactId = wxclient
			.getContacts()
			.find((item) => item.remark === contactName || item.name === contactName)?.wxid
		if (contactId) {
			logger.debug("contactId", contactId)
			if (wxclient.sendTxt(message, contactId) == 0)
				return `消息"${message}"已经发送给"${contactName}", 你可以在微信里看到。`
		}
		return "[错误]没有找到联系人: " + contactName
	} catch (error) {
		return "[错误]没有找到联系人: " + contactName + " " + error
	}
}

export const tools = [
	{
		type: "function",
		function: {
			name: "query_chatlog",
			description: "查询聊天记录中的特定事件",
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
			description: "发送或转发消息给某人或者群组",
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

	async shouldWeUseTools() {
		const response = await this.openai.chat.completions.create({
			model: this.model,
			messages: this.payload,
			tools: tools,
			tool_choice: "auto",
			temperature: 1,
			max_tokens: 1024,
		})
		//
		logger.info("检查 toolcall 请求返回: ", response.choices[0].message)
		return response.choices[0].message
	}

	async getResponse(topicId, payload) {
		this.payload = payload
		this.topicId = topicId
		try {
			const toolsCheckMessage = await this.shouldWeUseTools()
			if (toolsCheckMessage.tool_calls) {
				//this may raise exception if toolcall is not desired or can not supply correct answer
				return await this.processToolCalls(toolsCheckMessage)
			} else {
				logger.info("No tool calls found, return default response")
				return toolsCheckMessage.content
			}
		} catch (error) {
			logger.error("Error in getResponse", error)
			return null
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

		try {
			const toolcallResponse = await this.getToolCallsResponse(toolsCheckMessage.tool_calls)
			logger.debug("toolcallResponse", toolcallResponse)
			for (let toolCall of toolcallResponse) {
				if (toolCall.content.startsWith("[错误]")) {
					throw new Error("Tool call returned an error:" + toolCall.content)
				}
				payload.push(toolCall)
			}

			// 打印当前的payload数组
			logger.info("toolcall payload", colorize(payload))

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

			if (!functionToCall) {
				throw new Error("Function not found: " + functionName)
			}
			// 解析工具调用的函数参数（JSON格式）
			const functionArgs = JSON.parse(toolCall.function.arguments)

			// 打印函数参数
			console.log(functionArgs)

			// 调用对应的函数，并等待其响应
			const functionResponse = await functionToCall(this.topicId, functionArgs)

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
// const res = await toolCall.getResponse([{ role: "user", content: "发消息给爸爸,你怎么还不来" }])

// if (res) console.log(res)
// else console.log("no response")
