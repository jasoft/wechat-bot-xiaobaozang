import WebSocket from "ws"
import crypto from "crypto"
import fs from "fs"
import dotenv from "dotenv"
import base64 from "base64-js"
import sharp from "sharp"
import logger from "../common/index.js"

const env = dotenv.config().parsed // 环境
const appid = env.XUNFEI_APP_ID
const apiSecret = env.XUNFEI_API_SECRET
const apiKey = env.XUNFEI_API_KEY

const imageUnderstandingUrl = "wss://spark-api.cn-huabei-1.xf-yun.com/v2.1/image" // 云端环境的服务地址

class WsParam {
	// 初始化
	constructor(APPID, APIKey, APISecret, imageUnderstandingUrl) {
		this.APPID = APPID
		this.APIKey = APIKey
		this.APISecret = APISecret
		const url = new URL(imageUnderstandingUrl)
		this.host = url.hostname
		this.path = url.pathname
		this.ImageUnderstandingUrl = imageUnderstandingUrl
	}

	// 生成url
	createUrl() {
		// 生成RFC1123格式的时间戳
		const now = new Date()
		const date = new Date(now.getTime()).toUTCString()

		// 拼接字符串
		let signatureOrigin = `host: ${this.host}\n`
		signatureOrigin += `date: ${date}\n`
		signatureOrigin += `GET ${this.path} HTTP/1.1`

		// 进行hmac-sha256进行加密
		const signatureSha = crypto.createHmac("sha256", this.APISecret).update(signatureOrigin).digest()
		const signatureShaBase64 = base64.fromByteArray(signatureSha)

		const authorizationOrigin = `api_key="${this.APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureShaBase64}"`
		const authorization = base64.fromByteArray(Buffer.from(authorizationOrigin))

		// 将请求的鉴权参数组合为对象
		const params = { authorization, date, host: this.host }
		// 拼接鉴权参数，生成url
		const url = `${this.ImageUnderstandingUrl}?${new URLSearchParams(params).toString()}`
		// 此处打印出建立连接时候的url,参考本demo的时候可取消上方打印的注释，比对相同参数时生成的url与自己代码生成的url是否一致
		return url
	}
}

// 收到websocket错误的处理
const onError = (error) => {
	logger.error("### error:", error)
}

// 收到websocket关闭的处理
const onClose = () => {
	console.log(" ")
}

// 收到websocket连接建立的处理
const onOpen = (ws) => {
	run(ws)
}

const run = (ws) => {
	const data = JSON.stringify(genParams(ws.appid, ws.question))
	ws.send(data)
}

const genParams = (appid, question) => {
	/**
	 * 通过appid和用户的提问来生成请参数
	 */

	const data = {
		header: { app_id: appid },
		parameter: {
			chat: {
				domain: "image",
				temperature: 0.5,
				top_k: 4,
				max_tokens: 2028,
				auditing: "default",
			},
		},
		payload: { message: { text: question } },
	}

	return data
}

const getText = (role, content) => {
	const jsonContent = { role: role, content: content }
	return [jsonContent]
}

export async function imageUnderstanding(imagePath, question) {
	// ...
	const getImageData = async (imagePath, maxSize) => {
		const image = sharp(imagePath)
		const metadata = await image.metadata()
		const stats = fs.statSync(imagePath)
		const currentSize = stats.size

		logger.debug({ metadata, currentSize })

		if (currentSize > maxSize) {
			console.log("Image too large, resize it.")
			const resizedImage = await image.resize({ size: maxSize }).toBuffer()
			return resizedImage
		} else {
			return fs.readFileSync(imagePath)
		}
	}

	// ...
	const maxSize = 500 * 1024 // 700 KB

	const resizedImage = await getImageData(imagePath, maxSize)

	// Convert the resized image buffer to base64
	const resizedImageBase64 = resizedImage.toString("base64")
	console.log("resizedSize", resizedImageBase64.length)

	const text = [{ role: "user", content: resizedImageBase64, content_type: "image" }]
	let result = ""
	text.push({ role: "user", content: question })

	const wsParam = new WsParam(appid, apiKey, apiSecret, imageUnderstandingUrl)
	const wsUrl = wsParam.createUrl()
	const ws = new WebSocket(wsUrl, {
		rejectUnauthorized: false,
	})

	return new Promise((resolve, reject) => {
		ws.on("message", (message) => {
			const data = JSON.parse(message)
			const code = data.header.code
			if (code !== 0) {
				reject(`请求错误: ${code}, ${data.header.message}`)
				ws.close()
			} else {
				const choices = data.payload.choices
				const status = choices.status
				const content = choices.text[0].content
				result += content
				if (status === 2) {
					resolve(result)
					ws.close()
				}
			}
		})
		ws.on("error", onError)
		ws.on("close", onClose)
		ws.on("open", () => onOpen(ws))

		ws.appid = appid
		ws.question = text
	})
}
