import PocketBase from "pocketbase"
import dotenv from "dotenv"

dotenv.config()

const pb = new PocketBase(process.env.POCKETBASE_URL || "http://127.0.0.1:8090")

// 初始化认证
;(async () => {
    if (!process.env.POCKETBASE_ADMIN_EMAIL || !process.env.POCKETBASE_ADMIN_PASSWORD) {
        throw new Error("请在.env文件中设置 POCKETBASE_ADMIN_EMAIL 和 POCKETBASE_ADMIN_PASSWORD")
    }

    const authData = await pb.admins.authWithPassword(
        process.env.POCKETBASE_ADMIN_EMAIL,
        process.env.POCKETBASE_ADMIN_PASSWORD
    )
    pb.authStore.save(authData.token, authData.admin)
})()

// 通用错误处理
const handleError = (error, operation) => {
    console.error(`Database ${operation} error:`, error)
    if (error.response?.data) {
        console.error(`${operation} validation errors:`, JSON.stringify(error.response.data, null, 2))
    }
    throw error
}

// Message 相关操作
export const messageOperations = {
    async create(data) {
        try {
            // 确保布尔值被转换为"true"或"false"字符串
            const processedData = {
                topicId: data.topicId,
                isRoom: data.isRoom ? true : false,
                role: data.role,
                roomName: data.roomName,
                name: data.name,
                alias: data.alias || "default",
                content: data.content,
                type: data.type,
                summarized: data.summarized ? true : false,
                created: new Date().toISOString(),
            }

            console.log("Creating message with data:", JSON.stringify(processedData, null, 2))

            return await pb.collection("messages").create(processedData)
        } catch (error) {
            handleError(error, "message creation")
        }
    },

    async findMany(query = {}) {
        try {
            const { page = 1, perPage = 50, filter, sort } = query
            return await pb.collection("messages").getList(page, perPage, {
                filter,
                sort,
            })
        } catch (error) {
            handleError(error, "message query")
        }
    },

    async findFirst(filter) {
        try {
            const records = await pb.collection("messages").getList(1, 1, {
                filter,
            })
            return records.items[0] || null
        } catch (error) {
            handleError(error, "message findFirst")
        }
    },

    async update(id, data) {
        try {
            // 如果更新包含布尔字段，确保转换为"true"或"false"字符串
            const processedData = { ...data }
            if ("isRoom" in processedData) {
                processedData.isRoom = processedData.isRoom ? "true" : "false"
            }
            if ("summarized" in processedData) {
                processedData.summarized = processedData.summarized ? "true" : "false"
            }

            console.log("Updating message with data:", JSON.stringify(processedData, null, 2))

            return await pb.collection("messages").update(id, processedData)
        } catch (error) {
            handleError(error, "message update")
        }
    },
}

// Reminder 相关操作
export const reminderOperations = {
    async create(data) {
        try {
            return await pb.collection("reminders").create({
                cron: data.cron,
                command: data.command,
                botId: data.botId || "wxid_lzn88besya2s12",
                roomId: data.roomId || "filehelper",
                created: new Date().toISOString(),
            })
        } catch (error) {
            handleError(error, "reminder creation")
        }
    },

    async findMany(query = {}) {
        try {
            const { page = 1, perPage = 50, filter, sort } = query
            return await pb.collection("reminders").getList(page, perPage, {
                filter,
                sort,
            })
        } catch (error) {
            handleError(error, "reminder query")
        }
    },

    async update(id, data) {
        try {
            return await pb.collection("reminders").update(id, data)
        } catch (error) {
            handleError(error, "reminder update")
        }
    },

    async delete(id) {
        try {
            return await pb.collection("reminders").delete(id)
        } catch (error) {
            handleError(error, "reminder deletion")
        }
    },
}

export default {
    messages: messageOperations,
    reminders: reminderOperations,
    pb, // 导出实例以便需要时直接使用
}
