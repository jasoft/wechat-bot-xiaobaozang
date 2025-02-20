export class MessageQueue {
    constructor() {
        this.queue = []
        this.dlq = [] // Dead Letter Queue
    }

    enqueue(message, delaySeconds = 0) {
        const item = {
            message,
            retries: message.retries || 0,
            timestamp: Date.now(),
            processAfter: Date.now() + delaySeconds * 1000,
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
}

export const messageQueue = new MessageQueue()
