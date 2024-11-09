import logger from "loglevel"

logger.setLevel(process.env.LOG_LEVEL || "info")
logger.info("log level set to", logger.getLevel())

export default logger
