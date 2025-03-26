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
            // 确保布尔值被正确处理
            const processedData = {
                topicId: data.topicId,
                isRoom: Boolean(data.isRoom),
                role: data.role,
                roomName: data.roomName,
                name: data.name,
                alias: data.alias || "default",
                content: data.content,
                type: data.type,
                summarized: Boolean(data.summarized),
                created: new Date().toISOString(),
            }

            console.log("Creating message with data:", JSON.stringify(processedData, null, 2))

            return await pb.collection("messages").create(processedData)
        } catch (error) {
            console.error("Message creation error:", error)
            if (error.response?.data) {
                console.error("Validation errors:", JSON.stringify(error.response.data, null, 2))
            }
            throw error // 显式抛出错误，避免隐式返回 undefined
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

    async findFirst(query = {}) {
        try {
            const { filter } = query
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
