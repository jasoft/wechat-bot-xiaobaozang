import chalk from "chalk"
import logger from "loglevel"
import prefix from "loglevel-plugin-prefix"

const colors = {
    TRACE: chalk.magenta,
    DEBUG: chalk.cyan,
    INFO: chalk.blue,
    WARN: chalk.yellow,
    ERROR: chalk.red,
}

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
logger.name = "botlogger"
logger.setLevel(process.env.LOG_LEVEL || "info")
logger.info("logger level set to", logger.getLevel())

export default logger

logger.info("This is a logger module")
logger.debug("This is a debug message")
logger.warn("This is a warning message")
logger.error("This is an error message")
