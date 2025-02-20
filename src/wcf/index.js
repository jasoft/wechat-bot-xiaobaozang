import { wxClient } from "../common/wxmessage.js"
import { processUserMessage } from "./sendMessage.js"
import logger from "../common/logger.js"
import dotenv from "dotenv"
import { getServe } from "./serve.js"
import { colorize } from "json-colorizer"
import { startCron } from "../common/cron/crontab.js"
import { startApiServer } from "../common/apiserver.js"
import { messageQueue } from "../common/queue.js"

const env = dotenv.config().parsed // 环境参数

let serviceType = "Dify"
export let queryAI

let off = () => {}

async function startBot() {
    const client = wxClient
    const isLogin = client.isLogin()
    queryAI = getServe(serviceType)
    startCron(queryAI)
    startApiServer()
    // Start receiving messages
    off = client.listening((msg) => {
        logger.info("Received message:", msg)
        messageQueue.enqueue(msg)
    })

    logger.info("System Status:", { isLogin: isLogin, recving: client.msgReceiving })

    // Send an initial message

    logger.info("Bot is running...")

    queryAI("filehelper", [{ role: "user", content: "你好, 今天天气如何？" }]).then((res) => {
        logger.info("reply from ai", res.response)
    })
    // Keep the bot running indefinitely
    let tick = 0
    while (client.msgReceiving) {
        // 处理队列中的消息
        if (!messageQueue.isEmpty()) {
            const item = messageQueue.dequeue()
            if (!item) {
                // 如果没有可以立即处理的消息，等待下一次循环
                await new Promise((resolve) => setTimeout(resolve, 1000))
                continue
            }

            try {
                await processUserMessage(item.message, client, serviceType)
            } catch (error) {
                logger.error("Error processing message:", error)
                if (item.retries < 3) {
                    const delaySeconds = Math.pow(2, item.retries) * 15
                    item.retries += 1
                    logger.info(`重试第${item.retries}次，延迟${delaySeconds}秒`)
                    messageQueue.enqueue(item.message, delaySeconds)
                } else {
                    logger.error(`Message failed after 3 retries, moving to DLQ:`, item)
                    messageQueue.moveToDLQ(item)
                }
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
        // run summarize every 10 minutes
        if (tick % 600 === 0) {
            // new Summarizer().summarizeContentByTopicId()
            // logger.info("运行总结")
        }
        tick += 1
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
        case "Dify":
            if (env.DIFY_API_KEY && env.DIFY_BASE_URL) return botStart()
            logger.error("❌ 请先配置.env文件中的 DIFY_API_KEY，DIFY_BASE_URL")
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
    { name: "Dify", value: "Dify" },
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
