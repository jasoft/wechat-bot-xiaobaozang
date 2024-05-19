import pkg from "@wcferry/core"
const { Message, Wcferry } = pkg
import { defaultMessage } from "./sendMessage.js"
import logger from "../common/index.js"
import chalk from "chalk"
import dotenv from "dotenv"

const env = dotenv.config().parsed // 环境参数

let serviceType = "Groq"

let off = () => {}

async function startBot() {
	const client = new Wcferry({ port: 30049 })
	client.start()
	const isLogin = client.isLogin()

	// Start receiving messages
	off = client.on((msg) => {
		console.log("received message:", msg)
		defaultMessage(msg, client, serviceType)
	})

	console.log({ isLogin: isLogin, recving: client.msgReceiving })

	// Send an initial message

	console.log("Bot is running...")

	// Keep the bot running indefinitely
	while (client.msgReceiving) {
		await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait for 1 second
	}
	off()
	client.stop()
}

function bark(message) {
	const barkUrl = env.BARK_URL
	fetch(`${barkUrl}/${message}`)
		.then(() => {
			logger.info("Notification sent successfully")
		})
		.catch((err) => {
			logger.error("Failed to send notification:", err)
		})
}

// 启动微信机器人
function botStart() {
	startBot().catch(console.error)
}

// 控制启动
function handleStart(type) {
	serviceType = type
	logger.info("🌸🌸🌸 / type: ", type)
	switch (type) {
		case "ChatGPT":
			if (env.OPENAI_API_KEY) return botStart()
			logger.error("❌ 请先配置.env文件中的 OPENAI_API_KEY")
			break
		case "Kimi":
			if (env.KIMI_API_KEY) return botStart()
			logger.error("❌ 请先配置.env文件中的 KIMI_API_KEY")
			break
		case "Xunfei":
			if (env.XUNFEI_APP_ID && env.XUNFEI_API_KEY && env.XUNFEI_API_SECRET) {
				return botStart()
			}
			logger.error("❌ 请先配置.env文件中的 XUNFEI_APP_ID，XUNFEI_API_KEY，XUNFEI_API_SECRET")
			break
		case "Groq":
			if (env.GROQ_API_KEY) return botStart()
			logger.error("❌ 请先配置.env文件中的 GROQ_API_KEY")
			break
		default:
			logger.error("🚀服务类型错误")
	}
}

const serveList = [
	{ name: "ChatGPT", value: "ChatGPT" },
	{ name: "Kimi", value: "Kimi" },
	{ name: "Xunfei", value: "Xunfei" },
	{ name: "Groq", value: "Groq" },
	// ... 欢迎大家接入更多的服务
]
const questions = [
	{
		type: "list",
		name: "serviceType", //存储当前问题回答的变量key，
		message: "请先选择服务类型",
		choices: serveList,
	},
]
function init() {
	if (env.DEFAULT_AI) {
		handleStart(env.DEFAULT_AI)
		return
	}

	inquirer
		.prompt(questions)
		.then((res) => {
			handleStart(res.serviceType)
		})
		.catch((error) => {
			logger.error(error, "🚀error:")
		})
}
init()
