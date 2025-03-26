import { Message } from "../message.js"
import { messageQueue } from "../queue.js"

jest.mock("../queue.js", () => ({
    messageQueue: {
        enqueue: jest.fn(),
    },
}))

describe("Message", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe("construction", () => {
        it("should create message with default options", () => {
            const msg = new Message("Hello", "user123")
            expect(msg.content).toBe("Hello")
            expect(msg.receiver).toBe("user123")
            expect(msg.retries).toBe(0)
            expect(msg.maxRetries).toBe(3)
            expect(msg.delaySeconds).toBe(0)
            expect(msg.type).toBe("text")
            expect(msg.aters).toEqual([])
        })

        it("should create message with custom options", () => {
            const options = {
                retries: 1,
                maxRetries: 5,
                delaySeconds: 10,
                type: "image",
                aters: ["user456"],
            }
            const msg = new Message("Hello", "user123", options)
            expect(msg.retries).toBe(1)
            expect(msg.maxRetries).toBe(5)
            expect(msg.delaySeconds).toBe(10)
            expect(msg.type).toBe("image")
            expect(msg.aters).toEqual(["user456"])
        })
    })

    describe("send", () => {
        it("should enqueue message successfully", () => {
            const msg = new Message("Hello", "user123")
            msg.send()
            expect(messageQueue.enqueue).toHaveBeenCalledWith(msg, 0)
        })

        it("should enqueue message with delay", () => {
            const msg = new Message("Hello", "user123", { delaySeconds: 5 })
            msg.send()
            expect(messageQueue.enqueue).toHaveBeenCalledWith(msg, 5)
        })
    })

    describe("incrementRetry", () => {
        it("should increment retry count and return true if under max", () => {
            const msg = new Message("Hello", "user123")
            expect(msg.retries).toBe(0)
            expect(msg.incrementRetry()).toBe(true)
            expect(msg.retries).toBe(1)
        })

        it("should return false when max retries reached", () => {
            const msg = new Message("Hello", "user123", { retries: 3, maxRetries: 3 })
            expect(msg.incrementRetry()).toBe(false)
            expect(msg.retries).toBe(4)
        })
    })
})
