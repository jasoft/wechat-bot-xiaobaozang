import { messageQueue } from "./queue.js"
import rootlogger from "./logger.js"

const logger = rootlogger.getLogger("message")

export class Message {
    constructor(content, receiver, options = {}) {
        this.content = content
        this.receiver = receiver
        this.retries = options.retries || 0
        this.maxRetries = options.maxRetries || 3
        this.delaySeconds = options.delaySeconds || 0
        this.type = options.type || "text" // 消息类型: text, image, voice 等
        this.aters = options.aters || [] // @某人功能
    }

    /**
     * 发送消息到队列
     * @returns {void}
     */
    send() {
        try {
            messageQueue.enqueue(this, this.delaySeconds)
            logger.debug(
                `Message enqueued successfully: ${JSON.stringify({
                    content: this.content,
                    receiver: this.receiver,
                    type: this.type,
                    delaySeconds: this.delaySeconds,
                })}`
            )
        } catch (error) {
            logger.error(`Failed to enqueue message: ${error.message}`)
            throw error
        }
    }

    /**
     * 增加重试次数
     * @returns {boolean} 是否可以继续重试
     */
    incrementRetry() {
        this.retries++
        return this.retries <= this.maxRetries
    }
}
