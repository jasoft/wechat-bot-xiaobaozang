/**
 * 发送消息到讯飞API进行处理。
 * @param {Array} inputVal - 要发送的输入消息。
 * @returns {Promise<string>} - 一个解析为讯飞API响应的Promise。
 */
import CryptoJS from "crypto-js"
import dotenv from "dotenv"
import WebSocket from "ws"
import { tokensLimit } from "../../config.js"
import { imageUnderstanding } from "./imageunderstanding.js"
import path from "path"
import process from "process"
import { FileBox } from "file-box"
import { execSync } from "child_process"
import { recognizeAudio } from "./voicerecog.js"
import logger from "../common/index.js"

const env = dotenv.config().parsed // 环境参数
// APPID，APISecret，APIKey在https://console.xfyun.cn/services/cbm这里获取
// 星火认知大模型WebAPI文档:https://www.xfyun.cn/doc/spark/Web.html
// SDK&API错误码查询:https://www.xfyun.cn/document/error-code?code=
const appID = env.XUNFEI_APP_ID
const apiKey = env.XUNFEI_API_KEY
const apiSecret = env.XUNFEI_API_SECRET
// 地址必须填写，代表着大模型的版本号！！！！！！！！！！！！！！！！
const httpUrl = new URL("https://spark-api.xf-yun.com/v3.5/chat")

let modelDomain // V1.1-V3.5动态获取，高于以上版本手动指定

function authenticate() {
	// logger.info(httpUrl.pathname)
	// 动态获取domain信息
	switch (httpUrl.pathname) {
		case "/v1.1/chat":
			modelDomain = "general"
			break
		case "/v2.1/chat":
			modelDomain = "generalv2"
			break
		case "/v3.1/chat":
			modelDomain = "generalv3"
			break
		case "/v3.5/chat":
			modelDomain = "generalv3.5"
			break
	}

	return new Promise((resolve, reject) => {
		let url = "wss://" + httpUrl.host + httpUrl.pathname

		let host = "localhost:8080"
		let date = new Date().toGMTString()
		let algorithm = "hmac-sha256"
		let headers = "host date request-line"
		let signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${httpUrl.pathname} HTTP/1.1`
		let signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret)
		let signature = CryptoJS.enc.Base64.stringify(signatureSha)
		let authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
		let authorization = btoa(authorizationOrigin)
		url = `${url}?authorization=${authorization}&date=${date}&host=${host}`
		resolve(url)
	})
}

export async function handleImageMessage(lastUserMessage) {
	const imagePath = path.join(process.cwd(), lastUserMessage.content.match(/\{(.*)\}/)[1])
	//logger.info(imagePath)
	return imageUnderstanding(imagePath, env.IMAGE_UNDERSTANDING_PROMPT)
}

export async function handleVoiceMessage(lastUserMessage) {
	const voicePath = path.join(process.cwd(), lastUserMessage.content.match(/\{(.*)\}/)[1])
	let pcmFilePath
	if (voicePath.endsWith(".mp3")) {
		pcmFilePath = await mp32pcm(voicePath)
		return recognizeAudio(pcmFilePath)
	} else if (voicePath.endsWith(".sil")) {
		pcmFilePath = await sil2pcm(voicePath)
	} else {
		logger.error("语音文件格式不正确")
		return "语音文件格式不正确"
	}

	return recognizeAudio(pcmFilePath)
}
/**
 * 发送消息到讯飞ai接口获取回复。
 * @param {Array} inputVal - 输入的消息数组。
 * @returns {Promise<Object>} - 一个解析为讯飞接口响应的Promise。
 */
export async function xunfeiSendMsg(inputVal) {
	/**
	 * Handles image messages.
	 * @param {Object} lastUserMessage - The last user message object.
	 * @returns {Promise<string>} - A promise that resolves to the response from image understanding API.
	 */

	// 创建一个Promise
	let messagePromise = new Promise(async (resolve, reject) => {
		// 监听websocket的各阶段事件 并做相应处理
		let payloadText =
			// 注意：text里面的所有content内容加一起的tokens需要控制在8192以内，开发者如有较长对话需求，需要适当裁剪历史信息
			[{ role: "system", content: env.SYSTEM_PROMPT }]
		payloadText.push(...inputVal)
		const lastUserMessage = payloadText[payloadText.length - 1]
		// Extracted method to handle image messages

		// If the last message is an image message, call the image understanding API
		if (lastUserMessage.content.includes("[图片消息]")) {
			logger.info(lastUserMessage, "发现图片消息")
			// 如果是图片直接返回识别结果,不参与对话
			const response = await handleImageMessage(lastUserMessage)
			resolve({ orignalMessage: lastUserMessage.content, convertedMessage: response, response: response })
			return
		}
		// 如果最后一条消息是语音消息，调用语音理解接口
		if (lastUserMessage.content.includes("[语音消息]")) {
			logger.info(lastUserMessage, "发现语音消息")
			// 替换最后一条消息为语音识别结果
			payloadText.pop()
			payloadText.push({ role: "user", content: await handleVoiceMessage(lastUserMessage) })
		}

		//payloadText 构造完成,开始发送

		logger.info("payloadText to submit", payloadText)

		// 这几句放在函数外面就会导致发语音的时候莫名卡死, 放在这里就是正常的
		// 怀疑跟 socket 的生命周期有关
		// 咨询了 ai, 是因为 websocket 是异步的, 执行了之后再运行耗时较长的代码,这时候已经打开了,导致 open event 无法触发
		let myUrl = await authenticate()
		let total_res = "" // 请空回答历史
		let socket = new WebSocket(String(myUrl))

		socket.addEventListener("open", (event) => {
			logger.debug("socket开启连接")
			// 发送消息
			let params = {
				header: {
					app_id: appID,
					uid: "fd3f47e4-d",
				},
				parameter: {
					chat: {
						domain: modelDomain,
						temperature: 0.8,
						top_k: 4,
						max_tokens: tokensLimit,
					},
				},
				payload: {
					message: {
						// 如果想获取结合上下文的回答，需要开发者每次将历史问答信息一起传给服务端，如下示例
						// 注意：text里面的所有content内容加一起的tokens需要控制在8192以内，开发者如有较长对话需求，需要适当裁剪历史信息
						text: payloadText,
					},
					functions: {
						//TODO: 画图插件,调用讯飞的文生图 api
						text: [
							{
								name: "画图",
								description: "画图插件可以生成用户想要的图片",
								parameters: {
									type: "object",
									properties: {
										prompt: {
											type: "string",
											description: "你要画什么样的图？",
										},
									},
									required: ["prompt"],
								},
							},
						],
					},
				},
			}
			socket.send(JSON.stringify(params))
		})

		socket.addEventListener("message", (event) => {
			let data = JSON.parse(String(event.data))
			total_res += data.payload?.choices?.text?.[0]?.content ?? ""
			//logger.info(data.payload?.choices?.text?.[0]?.content ?? "")
			if (data.header.code !== 0) {
				logger.error({ code: data.header.code, message: data.header.message }, "socket出错")
				// 出错了"手动关闭连接"
				socket.close()
				reject("")
			}
			if (data.header.code === 0) {
				// 对话已经完成
				if (data.payload.choices.text && data.header.status === 2) {
					//total_res += data.payload.choices.text[0].content
					setTimeout(() => {
						// "对话完成，手动关闭连接"
						socket.close()
					}, 1000)
				}
			}
		})

		socket.addEventListener("close", (event) => {
			logger.debug("socket 连接关闭")
			// 对话完成后socket会关闭，将聊天记录换行处理
			resolve({
				orignalMessage: lastUserMessage.content,
				convertedMessage: payloadText.at(-1).content,
				response: total_res,
			})
		})

		socket.addEventListener("error", (event) => {
			logger.error(event, "socket连接错误")
			reject("")
		})
	})

	return await messagePromise
}

async function sil2pcm(voicePath) {
	const pcmFilePath = voicePath.replace(".sil", ".pcm")

	const ffmpegCommand = `ffmpeg -y -i ${voicePath} -f s16le -acodec pcm_s16le ${pcmFilePath} > /dev/null 2>&1`

	execSync(ffmpegCommand, (error, stdout, stderr) => {
		if (error) {
			console.error(`执行ffmpeg命令失败: ${error}`)
			return
		}

		logger.info(`Silk文件已成功转换为PCM格式: ${pcmFilePath}`)
	})
	return pcmFilePath
}

async function mp32pcm(voicePath) {
	const pcmFilePath = voicePath.replace(".mp3", ".pcm")

	const ffmpegCommand = `ffmpeg -y -i ${voicePath} -f s16le -acodec pcm_s16le ${pcmFilePath} > /dev/null 2>&1`

	execSync(ffmpegCommand, (error, stdout, stderr) => {
		if (error) {
			console.error(`执行ffmpeg命令失败: ${error}`)
			return
		}

		logger.info(`MP3文件已成功转换为PCM格式: ${pcmFilePath}`)
	})

	return pcmFilePath
}
