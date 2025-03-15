import { CronJob } from "cron"
import { syncChatLogs } from "./syncChatLogs.js"
import rootLogger from "../logger.js"
import db from "../db.js"
import { messageQueue } from "../queue.js"
import crypto from "crypto"
import { DEFAULT_WINDOW_METADATA_KEY } from "llamaindex"

const logger = rootLogger.getLogger("CRON")

// 用于存储所有活动的 cron 任务
const activeCrons = new Map()
// 用于标记哪些 cron 是从数据库加载的
const dbCrons = new Set()

// ...existing code...

let lastChecksum = ""

async function checkForChanges() {
    logger.debug("检查定时任务更新")
    try {
        const result = await db.reminders.findMany({
            sort: "-created",
        })
        const tasks = result?.items || []

        const currentChecksum = crypto.createHash("md5").update(JSON.stringify(tasks)).digest("hex")

        if (currentChecksum !== lastChecksum) {
            logger.info("检测到定时任务变更")
            await loadCronsFromDb()
            lastChecksum = currentChecksum
        }
    } catch (error) {
        logger.error("检查定时任务更新失败:", error)
    }
}

// 停止所有 cron 任务的方法
export function stopAllCrons() {
    for (const [name, cronTask] of activeCrons.entries()) {
        cronTask.stop()
        logger.info(`停止定时任务: ${name}`)
    }
    activeCrons.clear()
    dbCrons.clear()
}

// 修改为只停止数据库加载的 cron 任务
export function stopDbCrons() {
    for (const name of dbCrons) {
        const cronTask = activeCrons.get(name)
        if (cronTask) {
            cronTask.stop()
            activeCrons.delete(name)
            logger.info(`停止数据库定时任务: ${name}`)
        }
    }
    dbCrons.clear()
}

// 添加 cron 任务的方法
export function addCron(name, schedule, task, isFromDb = false) {
    if (activeCrons.has(name)) {
        const existingTask = activeCrons.get(name)
        existingTask.stop()
        activeCrons.delete(name)
        logger.info(`更新定时任务: ${name}`)
    }

    const cronTask = new CronJob(
        schedule,
        task,
        null, // onComplete
        true, // start
        "Asia/Shanghai" // timeZone
    )

    activeCrons.set(name, cronTask)

    if (isFromDb) {
        dbCrons.add(name)
    }

    // 修正时间格式化，确保包含具体时间
    const nextRunDate = cronTask.nextDate().toJSDate()
    const nextRun = nextRunDate.toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })

    logger.info(`添加${isFromDb ? "数据库" : ""}定时任务: ${name}, 计划: ${schedule}, 下次运行: ${nextRun}`)

    return cronTask
}

// 从数据库加载 cron 任务
export async function loadCronsFromDb(queryAI) {
    try {
        // 停止之前数据库加载的 cron 任务
        stopDbCrons()

        // 这里从数据库加载 cron 任务配置
        const result = await db.reminders.findMany()
        const tasks = result?.items || []

        tasks.forEach((task) => {
            logger.info("CRON", "加载定时任务", task)
            addCron(
                task.id,
                task.cron,
                () => {
                    logger.info("CRON", "执行定时任务", task)
                    // 构造消息对象并发送到队列
                    const message = {
                        id: "cron_" + Date.now(),
                        type: 9999, // 1=文本, 3=图片, 34=语音, 9999=系统指令
                        sender: task.botId,
                        content: task.command,
                        roomId: task.botId, // 本质是模拟一个跟小宝藏的聊天
                    }
                    messageQueue.enqueue(message)
                    logger.info("已将定时任务消息加入队列", message)
                },
                true
            )
        })

        logger.info("成功从数据库重新加载定时任务")
        // 显示所有crons及其下一次执行时间
        for (const [name, cronTask] of activeCrons.entries()) {
            const nextRunDate = cronTask.nextDate().toJSDate()
            const nextRun = nextRunDate.toLocaleString("zh-CN", {
                timeZone: "Asia/Shanghai",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            })
            logger.info(`定时任务: ${name}, 下次运行时间: ${nextRun}`)
        }
        return true
    } catch (error) {
        logger.error("从数据库加载定时任务失败:", error)
        return false
    }
}

// 启动 cron 系统
export function startCron(queryAI) {
    // 初始化静态定义的 cron 任务
    addCron("sync-chatlogs", "*/5 * * * *", () => {
        logger.debug("CRON", "同步聊天记录到Mellisearch")
        syncChatLogs()
    })
    // 每分钟检查一次数据库变更
    addCron("check-db-changes", "*/1 * * * *", checkForChanges, false)

    logger.info("Cron 系统已启动")
}
