import cron from "node-cron"
import { syncChatLogs } from "./syncChatLogs.js"
import logger from "../logger.js"

// 每小时执行一次任务
export async function startCron() {
	cron.schedule("*/5 * * * *", () => {
		logger.info("CRON", "同步聊天记录到Mellisearch")
		syncChatLogs()
	})

	// 每天凌晨1点执行任务
	cron.schedule("0 1 * * *", () => {
		logger.info("CRON", "每天凌晨1点执行")
	})
}
