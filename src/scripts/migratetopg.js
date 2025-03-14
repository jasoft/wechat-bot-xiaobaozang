import { PrismaClient as MysqlPrismaClient } from "@prisma/mysql-client"
import { PrismaClient as PgPrismaClient } from "@prisma/pg-client"

// 初始化MySQL客户端
const mysqlPrisma = new MysqlPrismaClient()

// 初始化PostgreSQL客户端
const pgPrisma = new PgPrismaClient()

async function migrateData() {
    try {
        // 迁移消息数据
        console.log("开始迁移消息数据...")
        const messages = await mysqlPrisma.message.findMany()
        console.log(`找到 ${messages.length} 条消息记录`)
        if (messages.length > 0) {
            await pgPrisma.message.createMany({ data: messages })
            console.log("消息数据迁移完成")
        }

        // 迁移提醒任务数据
        console.log("\n开始迁移提醒任务数据...")
        const reminders = await mysqlPrisma.reminder.findMany()
        console.log(`找到 ${reminders.length} 条提醒任务记录`)
        if (reminders.length > 0) {
            await pgPrisma.reminder.createMany({ data: reminders })
            console.log("提醒任务数据迁移完成")
        }

        console.log("\n所有数据迁移完成!")
    } catch (error) {
        console.error("迁移错误:", error)
        throw error
    } finally {
        await mysqlPrisma.$disconnect()
        await pgPrisma.$disconnect()
    }
}

// 运行迁移
migrateData().catch((error) => {
    console.error("迁移失败:", error)
    process.exit(1)
})
