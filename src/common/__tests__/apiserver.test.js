import { createApp } from "../apiserver.js"
import request from "supertest"
import { wxClient } from "../wxmessage.js"
import { messageQueue } from "../queue.js"
import { queryAI } from "../../wcf/index.js"

// Mock依赖
jest.mock("../wxmessage.js", () => ({
    wxClient: {
        sendTxtByName: jest.fn(),
        getContactId: jest.fn(),
    },
}))

jest.mock("../queue.js", () => ({
    messageQueue: {
        enqueue: jest.fn(),
    },
}))

jest.mock("../../wcf/index.js", () => ({
    queryAI: jest.fn(),
}))

jest.mock("../logger.js", () => ({
    info: jest.fn(),
    error: jest.fn(),
}))

describe("API Server Tests", () => {
    let app
    let server

    beforeAll(() => {
        app = createApp()
        server = app.listen()
    })

    afterAll(() => {
        server.close()
    })

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe("POST /message", () => {
        it("应该成功发送消息", async () => {
            wxClient.sendTxtByName.mockImplementation(() => {})
            const response = await request(server).post("/message").send({ recipient: "test-user", message: "hello" })

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                message: "Message sent successfully",
                code: 200,
                recipient: "test-user",
                text: "hello",
            })
            expect(wxClient.sendTxtByName).toHaveBeenCalledWith("hello", "test-user")
        })

        it("当缺少必要参数时应该返回400", async () => {
            const response = await request(server).post("/message").send({})

            expect(response.status).toBe(400)
            expect(response.body.message).toBe("Recipient and message are required.")
        })
    })

    describe("POST /message/toolcall", () => {
        it("应该成功将消息加入队列", async () => {
            wxClient.getContactId.mockReturnValue("test-contact-id")
            process.env.BOT_ID = "test-bot"

            const response = await request(server)
                .post("/message/toolcall")
                .send({ recipient: "test-user", message: "hello" })

            expect(response.text).toBe('微信消息"hello"成功发送给"test-user"啦! ')
            expect(messageQueue.enqueue).toHaveBeenCalledWith({
                id: expect.any(String),
                type: 1,
                sender: "test-bot",
                content: "hello",
                roomId: "test-contact-id",
            })
        })

        it("发生错误时应该返回错误信息", async () => {
            messageQueue.enqueue.mockImplementation(() => {
                throw new Error("Queue error")
            })

            const response = await request(server)
                .post("/message/toolcall")
                .send({ recipient: "test-user", message: "hello" })

            expect(response.text).toBe("发送消息出错啦, 重新试一下吧")
        })
    })

    describe("GET /message", () => {
        it("应该返回正确的消息", async () => {
            const response = await request(server).get("/message")

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                code: 200,
                message: "一个发送微信的 api",
            })
        })
    })

    describe("POST /reminder/callback", () => {
        it("应该处理提醒回调并调用AI", async () => {
            const mockReminders = [
                {
                    title: "Test reminder",
                },
            ]

            queryAI.mockResolvedValue({ response: "AI response" })

            const response = await request(server)
                .post("/reminder/callback")
                .send({ reminders_notified: mockReminders })

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                code: 200,
                message: ["AI response"],
            })
            expect(queryAI).toHaveBeenCalledWith("reminder/callback", [
                {
                    role: "user",
                    content: "Test reminder",
                },
            ])
        })

        it("处理错误情况", async () => {
            queryAI.mockRejectedValue(new Error("AI error"))

            const response = await request(server)
                .post("/reminder/callback")
                .send({ reminders_notified: [{ title: "Test" }] })

            expect(response.status).toBe(500)
            expect(response.body).toEqual({
                code: 500,
                message: "Internal server error",
            })

            const logger = require("../logger.js")
            expect(logger.error).toHaveBeenCalled()
        })
    })
})
