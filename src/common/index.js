import logger from "npmlog"

Object.defineProperty(logger, "heading", {
	get: () => {
		return `[${new Date().toLocaleString()}]`
	},
})
logger.headingStyle = { bg: "", fg: "white" }

// logger.info("module:npmlog", "message", colored(person))
// // 自定义前缀和样式

// logger.headingStyle = { fg: "white", bg: "black" }
// // 自定义日志级别的颜色
logger.addLevel("event", 5000, { fg: "cyan" }, "event")
logger.addLevel("debug", 1500, { fg: "blue" }, "debug")
// logger.addLevel("warn", 3000, { fg: "yellow", bold: true })
// logger.addLevel("error", 4000, { fg: "red", bold: true, underline: true })
logger.level = "debug"
// 使用自定义的日志级别
// logger.event("INIT", "Initialization started")
// logger.warn("DEPLOY", "Deployment might take a while")
// logger.error("DB", "Database connection failed")

// 使用自定义的事件记录函数
export function logEvent(event, message) {
	logger.event(`[${event}]`, message)
}

// 示例日志记录
// logEvent("START", "Application is starting...")
// logEvent("DB", "Database connected successfully")
// logEvent("ERROR", "An unexpected error occurred")
// logEvent("SHUTDOWN", "Application is shutting down...")

export default logger
