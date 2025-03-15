import { messageOperations } from "../src/common/db.js"

describe("Database Operations - Messages", () => {
    let createdMessageId

    const validMessageData = {
        topicId: "123456789",
        isRoom: true,
        role: "user",
        roomName: "测试群",
        name: "TestUser123",
        alias: "TestAlias",
        content: "这是一条测试消息",
        type: "text",
        summarized: true,
    }

    beforeAll(async () => {
        // 等待PocketBase认证完成
        await new Promise((resolve) => setTimeout(resolve, 1000))
    })

    test("should create a message with valid data", async () => {
        try {
            const message = await messageOperations.create(validMessageData)
            expect(message).toBeDefined()
            expect(message.id).toBeDefined()
            expect(message.topicId).toBe(validMessageData.topicId)
            expect(message.content).toBe(validMessageData.content)
            createdMessageId = message.id
        } catch (error) {
            if (error.response?.data) {
                console.error("Create message error details:", JSON.stringify(error.response.data, null, 2))
            } else {
                console.error("Create message error:", error)
            }
            throw error
        }
    }, 10000)

    test("should fail to create message with missing required fields", async () => {
        const invalidData = {
            content: "test content",
        }
        await expect(messageOperations.create(invalidData)).rejects.toBeDefined()
    })

    describe("operations on created message", () => {
        beforeAll(() => {
            // 如果没有成功创建消息，跳过这组测试
            if (!createdMessageId) {
                console.log("Skipping message operation tests as no message was created")
                return
            }
        })

        test("should find created message", async () => {
            const filter = `id = "${createdMessageId}"`
            const message = await messageOperations.findFirst(filter)
            expect(message).toBeDefined()
            expect(message.id).toBe(createdMessageId)
            expect(message.content).toBe(validMessageData.content)
        })

        test("should update message", async () => {
            const updateData = {
                content: "更新后的消息内容",
                summarized: false, // 确保更新时也设置正确的类型
            }
            const updatedMessage = await messageOperations.update(createdMessageId, updateData)
            expect(updatedMessage).toBeDefined()
            expect(updatedMessage.id).toBe(createdMessageId)
            expect(updatedMessage.content).toBe(updateData.content)
        })

        test("should find messages with query", async () => {
            const query = {
                filter: `topicId = "${validMessageData.topicId}"`,
                sort: "-created",
            }
            const messages = await messageOperations.findMany(query)
            expect(messages).toBeDefined()
            expect(messages.items.length).toBeGreaterThan(0)
            expect(messages.items[0].topicId).toBe(validMessageData.topicId)
        })
    })
})
