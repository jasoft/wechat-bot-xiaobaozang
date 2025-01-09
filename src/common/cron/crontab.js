import cron from "node-cron"
import { syncChatLogs } from "./syncChatLogs.js"
import logger from "../logger.js"
import { PrismaClient } from "@prisma/client"
const { exec } = require("child_process")

const prisma = new PrismaClient()
// 每小时执行一次任务
export async function startCron(ai) {
  cron.schedule("*/5 * * * *", () => {
    logger.info("CRON", "同步聊天记录到Mellisearch")
    syncChatLogs()
  })

  // cron.schedule("*/1 * * * *", () => {
  //   logger.info("CRON", "重新启动微信")
  //   exec("powershell.exe -File ./autorestart.ps1", (error, stdout, stderr) => {
  //     if (error) {
  //       logger.error("CRON", `执行脚本错误: ${error.message}`)
  //     }
  //     if (stderr) {
  //       logger.error("CRON", `脚本错误输出: ${stderr}`)
  //     }
  //     logger.info("CRON", `脚本输出: ${stdout}`)
  //   })
  // })

  //cron.getTasks().forEach((task) => task.start())

  stopAllCrons()
  loadCrons(ai)
}
let scheduledTasks = []
async function loadCrons(ai) {
  const tasks = await prisma.reminder.findMany()

  tasks.forEach((task) => {
    logger.info("CRON", "加载定时任务", task)
    scheduledTasks.push(
      cron.schedule(task.cron, () => {
        logger.info("CRON", "执行定时任务", task)
        ai("filehelper", [{ role: "user", content: task.command }]).then((res) => {
          logger.info("CRON", "执行定时任务结果", res.response)
        })
      })
    )
  })
}
function stopAllCrons() {
  scheduledTasks.forEach((task) => task.stop())
  scheduledTasks = [] // 清空任务列表
}
