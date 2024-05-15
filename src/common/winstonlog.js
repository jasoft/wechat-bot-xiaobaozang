"use strict"
import { createLogger, format, transports } from "winston"
import { colorize as colored } from "json-colorizer"
const { combine, timestamp, printf, colorize, prettyPrint, errors, splat, json, label } = format

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
		// 如果参数是一个对象，则使用 JSON.stringify 进行美化打印
		const formattedValue = typeof value === "object" ? colorObject(value) : value
		logMessage += ` ${key}: ${formattedValue}`
	})
	return logMessage
})

// 创建日志记录器
const logger = createLogger({
	level: "info",
	format: combine(
		colorize(), // 添加颜色
		timestamp(), // 添加时间戳
		splat(),
		errors({ stack: true }),
		myFormat
	),
	//myFormat

	transports: [
		//
		// - Write to all logs with level `info` and below to `quick-start-combined.log`.
		// - Write all logs error (and below) to `quick-start-error.log`.
		//
		new transports.Console(),
	],
})

//
// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
//
const jsonText = await (await fetch("https://dummyjson.com/products/1")).json()
logger.info(jsonText)
// 记录简单的消息
logger.info({ jsonText })

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

logger.log("warn", "test message %s, %s", "first", "second", { number: 123 })

logger.log("info", "colored message", { color: "red" })
logger.info("colored message", { res: {} })

const a = 1
const b = "hello"
const c = { key: "value" }
const d = [1, 2, 3]
const e = new Date()
const f = true
