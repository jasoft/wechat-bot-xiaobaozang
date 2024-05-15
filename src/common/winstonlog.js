import { createLogger, format, transports } from "winston"
import { colorize as colored } from "json-colorizer"
const { combine, timestamp, printf, colorize } = format

function colorObject(obj) {
	if (typeof obj === "object") return colored(obj)
	else {
		return obj
	}
}
// 定义自定义格式化器
const myFormat = printf(({ level, message, timestamp, ...args }) => {
	if (typeof message === "object") {
		message = colored(message) // 格式化对象为字符串
	}
	const formattedTimestamp = new Date(timestamp).toLocaleString() // 使用 JavaScript 内置方法格式化时间戳
	let logMessage = `${formattedTimestamp} [${level}] ${message}`
	Object.entries(args).forEach(([key, value]) => {
		logMessage += ` [${key}: ${colorObject(value)}]`
	})
	return logMessage
})

// 创建日志记录器
const logger = createLogger({
	level: "info",
	format: combine(
		colorize(), // 添加颜色
		timestamp(), // 添加时间戳
		myFormat
	),
	transports: [new transports.Console()],
})

// 记录简单的消息
logger.info("This is a simple info message")

// 记录一个对象
logger.info({
	message: "This is an info message with an object",
	additional: "info",
	user: { id: 1, name: "John Doe" },
})

// 记录多个参数
logger.info("This is an info message with multiple arguments", {
	additional: "info",
	user: { id: 1, name: "John Doe" },
})

logger.info("prefix", "This is an info message with multiple arguments", {
	additional: "info",
	user: { id: 1, name: "John Doe" },
})
