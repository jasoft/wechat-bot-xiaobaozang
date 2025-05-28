import chalk from "chalk"
import logger from "loglevel"
import prefix from "loglevel-plugin-prefix"
import winston from "winston"
import path from "path"

const colors = {
    TRACE: chalk.magenta,
    DEBUG: chalk.cyan,
    INFO: chalk.white,
    WARN: chalk.yellow,
    ERROR: chalk.red,
}

// 创建logs目录的winston logger
const fileLogger = winston.createLogger({
    level: "debug",
    format: winston.format.combine(
        winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: path.join("logs", "error.log"),
            level: "error",
        }),
        new winston.transports.File({
            filename: path.join("logs", "combined.log"),
        }),
    ],
})

// 配置loglevel
prefix.reg(logger)
logger.enableAll()

prefix.apply(logger, {
    format(level, name, timestamp) {
        return `${chalk.gray(`[${timestamp}]`)} ${colors[level.toUpperCase()](level)} ${chalk.green(`${name}:`)}`
    },
})

prefix.apply(logger.getLogger("critical"), {
    format(level, name, timestamp) {
        return chalk.red.bold(`[${timestamp}] ${level} ${name}:`)
    },
})

// 获取原始的日志方法
const originalFactory = logger.methodFactory

// 重写methodFactory来添加文件写入
logger.methodFactory = function (methodName, logLevel, loggerName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName)

    return function (message, ...args) {
        // 调用原始的控制台输出方法
        rawMethod.apply(this, [message, ...args])

        // 写入到文件
        const logMessage = typeof message === "string" ? message : JSON.stringify(message)
        const additionalArgs = args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")
        const fullMessage = `${logMessage} ${additionalArgs}`.trim()

        // 根据日志级别调用相应的winston方法
        switch (methodName) {
            case "trace":
            case "debug":
                fileLogger.debug(fullMessage)
                break
            case "info":
                fileLogger.info(fullMessage)
                break
            case "warn":
                fileLogger.warn(fullMessage)
                break
            case "error":
                fileLogger.error(fullMessage)
                break
        }
    }
}

logger.name = "botlogger"
logger.setLevel(process.env.LOG_LEVEL || "debug")
logger.info("logger level set to", logger.getLevel())

export default logger
