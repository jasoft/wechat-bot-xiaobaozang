import PocketBase from "pocketbase"
import dotenv from "dotenv"

dotenv.config()

const pb = new PocketBase(process.env.POCKETBASE_URL || "http://127.0.0.1:8090")

async function authenticate() {
    if (!process.env.POCKETBASE_ADMIN_EMAIL || !process.env.POCKETBASE_ADMIN_PASSWORD) {
        throw new Error("请在.env文件中设置 POCKETBASE_ADMIN_EMAIL 和 POCKETBASE_ADMIN_PASSWORD")
    }

    try {
        // 注意：这里应该使用 admins 而不是 _superusers
        const authData = await pb.admins.authWithPassword(
            process.env.POCKETBASE_ADMIN_EMAIL,
            process.env.POCKETBASE_ADMIN_PASSWORD
        )
        console.log("管理员登录成功")
    } catch (error) {
        console.error("管理员登录失败:", error)
        throw error
    }
}

async function createCollections() {
    try {
        // 认证
        await authenticate()

        // 先检查是否已存在，如果存在则删除
        try {
            const existingMessages = await pb.collections.getOne("messages")
            if (existingMessages) {
                await pb.collections.delete("messages")
                console.log("删除已存在的 messages collection")
            }
        } catch (e) {
            // 不存在，忽略错误
        }

        try {
            const existingReminders = await pb.collections.getOne("reminders")
            if (existingReminders) {
                await pb.collections.delete("reminders")
                console.log("删除已存在的 reminders collection")
            }
        } catch (e) {
            // 不存在，忽略错误
        }

        // 创建 messages collection

        const messagesCollection = await pb.collections.create({
            name: "messages",
            type: "base",
            listRule: "",
            createRule: "",
            viewRule: "",
            schema: [
                {
                    name: "topicId",
                    type: "text",
                },
                {
                    name: "isRoom",
                    type: "bool",
                },
                {
                    name: "role",
                    type: "text",
                },
                {
                    name: "roomName",
                    type: "text",
                },
                {
                    name: "name",
                    type: "text",
                },
                {
                    name: "alias",
                    type: "text",
                },
                {
                    name: "content",
                    type: "text",
                },
                {
                    name: "type",
                    type: "text",
                },
                {
                    name: "summarized",
                    type: "bool",
                },
                {
                    // 新增字段
                    name: "created",
                    type: "date",
                },
            ],
        })

        console.log("Messages collection created:", messagesCollection)

        // 创建 reminders collection
        const remindersCollection = await pb.collections.create({
            name: "reminders",
            type: "base",
            listRule: "",
            createRule: "",
            viewRule: "",
            schema: [
                {
                    name: "cron",
                    type: "text",
                },
                {
                    name: "command",
                    type: "text",
                },
                {
                    name: "botId",
                    type: "text",
                },
                {
                    name: "roomId",
                    type: "text",
                },
            ],
        })

        console.log("Reminders collection created:", remindersCollection)

        console.log("Collections created successfully")
    } catch (error) {
        console.error("Error creating collections:", error)
    }
}

createCollections().then(() => {
    console.log("初始化完成")
    process.exit(0)
})
