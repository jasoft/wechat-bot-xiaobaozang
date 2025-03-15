import PocketBase from "pocketbase"
import dotenv from "dotenv"

dotenv.config()

const pb = new PocketBase(process.env.POCKETBASE_URL || "http://127.0.0.1:8090")

async function authenticate() {
    if (!process.env.POCKETBASE_ADMIN_EMAIL || !process.env.POCKETBASE_ADMIN_PASSWORD) {
        throw new Error("请在.env文件中设置 POCKETBASE_ADMIN_EMAIL 和 POCKETBASE_ADMIN_PASSWORD")
    }

    try {
        const authData = await pb
            .collection("_superusers")
            .authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL, process.env.POCKETBASE_ADMIN_PASSWORD)
        pb.authStore.save(authData.token, authData.record)
        console.log("管理员登录成功:", authData.record)

        // 登录成功后获取collections列表
        const collections = await pb.collections.getList()
        console.log(
            "现有collections:",
            collections.items.map((c) => c.name)
        )
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
            fields: [
                {
                    name: "topicId",
                    type: "text",
                    required: true,
                    system: false,
                    options: {
                        min: 1,
                        max: null,
                        pattern: "",
                    },
                },
                {
                    name: "isRoom",
                    type: "bool",
                    required: false,
                    system: false,
                    options: {},
                },
                {
                    name: "role",
                    type: "text",
                    required: true,
                    system: false,
                    options: {
                        min: 1,
                        max: null,
                        pattern: "",
                    },
                },
                {
                    name: "roomName",
                    type: "text",
                    required: false,
                    system: false,
                    options: {
                        min: null,
                        max: null,
                        pattern: "",
                    },
                },
                {
                    name: "name",
                    type: "text",
                    required: true,
                    system: false,
                    options: {
                        min: 1,
                        max: null,
                        pattern: "",
                    },
                },
                {
                    name: "alias",
                    type: "text",
                    required: true,
                    system: false,
                    options: {
                        min: 1,
                        max: null,
                        pattern: "",
                    },
                },
                {
                    name: "content",
                    type: "text",
                    required: true,
                    system: false,
                    options: {
                        min: 1,
                        max: null,
                        pattern: "",
                    },
                },
                {
                    name: "type",
                    type: "text",
                    required: false,
                    system: false,
                    options: {
                        min: null,
                        max: null,
                        pattern: "",
                    },
                },
                {
                    name: "summarized",
                    type: "bool",
                    required: false,
                    system: false,
                    options: {},
                },
                {
                    name: "created",
                    type: "date",
                    required: true,
                    system: false,
                    options: {},
                },
            ],
        })

        console.log("等待 messages collection 创建完成...")

        try {
            // 验证 messages collection
            console.log("开始验证 messages collection...")
            const createdMessages = await pb.collections.getOne("messages")
            console.log("获取到 messages collection:", createdMessages ? "成功" : "失败")
            console.log("Collection完整信息:", JSON.stringify(createdMessages, null, 2))

            if (!createdMessages || !createdMessages.fields) {
                throw new Error("Messages collection 创建验证失败: fields未定义")
            }

            console.log("\n=== Messages Collection Fields ===")
            console.log("Fields内容:", JSON.stringify(createdMessages.fields, null, 2))

            const fields = createdMessages.fields.filter((f) => !f.system) // 排除系统字段
            const requiredFieldNames = ["topicId", "role", "name", "alias", "content", "type", "created", "roomName"]

            const missingFields = requiredFieldNames.filter((name) => !fields.some((f) => f.name === name))

            if (missingFields.length > 0) {
                throw new Error(`Messages collection缺少必需字段: ${missingFields.join(", ")}`)
            }

            console.log("Messages collection字段验证成功")
        } catch (error) {
            console.error("验证 messages collection 失败:", error)
            throw error
        }

        // 创建 reminders collection
        const remindersCollection = await pb.collections.create({
            name: "reminders",
            type: "base",
            listRule: "",
            createRule: "",
            viewRule: "",
            fields: [
                {
                    name: "cron",
                    type: "text",
                    required: true,
                    system: false,
                    options: {
                        min: 1,
                        max: null,
                        pattern: "",
                    },
                },
                {
                    name: "command",
                    type: "text",
                    required: true,
                    system: false,
                    options: {
                        min: 1,
                        max: null,
                        pattern: "",
                    },
                },
                {
                    name: "botId",
                    type: "text",
                    required: true,
                    system: false,
                    options: {
                        min: 1,
                        max: null,
                        pattern: "",
                        default: "wxid_lzn88besya2s12",
                    },
                },
                {
                    name: "roomId",
                    type: "text",
                    required: true,
                    system: false,
                    options: {
                        min: 1,
                        max: null,
                        pattern: "",
                        default: "filehelper",
                    },
                },
                {
                    name: "created",
                    type: "date",
                    required: true,
                    system: false,
                    options: {},
                },
            ],
        })

        console.log("等待 reminders collection 创建完成...")

        try {
            console.log("开始验证 reminders collection...")
            const createdReminders = await pb.collections.getOne("reminders")
            console.log("获取到 reminders collection:", createdReminders ? "成功" : "失败")

            console.log("Collection完整信息:", JSON.stringify(createdReminders, null, 2))

            if (!createdReminders || !createdReminders.fields) {
                throw new Error("Reminders collection 创建验证失败: fields未定义")
            }

            console.log("\n=== Reminders Collection Fields ===")
            console.log("Fields内容:", JSON.stringify(createdReminders.fields, null, 2))

            const fields = createdReminders.fields.filter((f) => !f.system) // 排除系统字段
            const requiredFieldNames = ["cron", "command", "botId", "roomId", "created"]

            const missingFields = requiredFieldNames.filter((name) => !fields.some((f) => f.name === name))

            if (missingFields.length > 0) {
                throw new Error(`Reminders collection缺少必需字段: ${missingFields.join(", ")}`)
            }

            console.log("Reminders collection字段验证成功")
        } catch (error) {
            console.error("验证 reminders collection 失败:", error)
            throw error
        }

        // 最终验证
        const allCollections = await pb.collections.getList(1, 50)
        console.log("\n=== 验证所有collections ===")
        allCollections.items.forEach((collection) => {
            if (collection.name === "messages" || collection.name === "reminders") {
                console.log(`\n${collection.name} collection:`)
                const fields = collection.fields.filter((f) => !f.system)
                console.log("- 字段数量:", fields.length)
                console.log("- 字段列表:", fields.map((field) => field.name).join(", "))
            }
        })

        console.log("\nCollections创建并验证成功!")
    } catch (error) {
        console.error("Error:", error)
        if (error.data) {
            console.error("详细错误信息:", JSON.stringify(error.data, null, 2))
        }
        process.exit(1)
    }
}

createCollections()
    .then(() => {
        console.log("\n初始化完成")
        process.exit(0)
    })
    .catch((error) => {
        console.error("\n初始化失败:", error)
        process.exit(1)
    })
