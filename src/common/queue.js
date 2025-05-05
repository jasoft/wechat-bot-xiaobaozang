export class MessageQueue {
    constructor(maxRetries = 3) {
        this.queue = []
        this.dlq = [] // Dead Letter Queue
        this.maxRetries = maxRetries
        this.retryDelays = [5, 15, 30] // 延迟时间（秒）：5秒、15秒、30秒
    }

    enqueue(message, retries = 0, delaySeconds = 0) {
        const item = {
            message,
            retries: retries,
            timestamp: Date.now(),
            processAfter: Date.now() + delaySeconds * 1000,
            initialTimestamp: Date.now(), // 添加初始时间戳用于追踪消息生命周期
        }
        this.queue.push(item)
    }

    dequeue() {
        const now = Date.now()
        const index = this.queue.findIndex((item) => item.processAfter <= now)
        if (index === -1) return null
        return this.queue.splice(index, 1)[0]
    }

    isEmpty() {
        return this.queue.length === 0
    }

    moveToDLQ(item) {
        this.dlq.push({
            ...item,
            movedToDLQAt: Date.now(),
        })
    }

    // 处理消息失败时的重试逻辑
    async handleFailure(item) {
        if (item.retries >= this.maxRetries) {
            // 超过最大重试次数，移到死信队列
            this.moveToDLQ(item)
            return false
        }

        // 获取当前重试次数对应的延迟时间，如果超出数组范围则使用最后一个值
        const delaySeconds = this.retryDelays[item.retries] || this.retryDelays[this.retryDelays.length - 1]

        // 重新入队，增加重试次数，设置延迟时间
        this.enqueue(item.message, item.retries + 1, delaySeconds)
        return true
    }

    // 获取重试相关信息
    getRetryInfo(item) {
        return {
            attempts: item.retries + 1,
            maxRetries: this.maxRetries,
            nextDelay:
                item.retries < this.maxRetries
                    ? this.retryDelays[item.retries] || this.retryDelays[this.retryDelays.length - 1]
                    : null,
            totalTime: Date.now() - item.initialTimestamp,
        }
    }
}

export const messageQueue = new MessageQueue()
