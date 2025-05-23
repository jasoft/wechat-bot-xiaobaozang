export class Conversation {
    constructor() {
        this.messages = []
    }

    addMessage(message) {
        this.messages.push(message)
    }

    getMessages() {
        return this.messages
    }

    getLastMessage() {
        return this.messages.at(-1)
    }

    getFirstMessage() {
        return this.messages.at(0)
    }

    getLastRoleMessage(role) {
        for (let i = this.messages.length - 1; i >= 0; i--) {
            const message = this.messages[i]
            if (message.role === role) {
                return message
            }
        }
    }

    getFirstRoleMessage(role) {
        for (let i = 0; i < this.messages.length; i++) {
            const message = this.messages[i]
            if (message.role === role) {
                return message
            }
        }
    }
}

/**
 * 从 messages 中提取最近一次对话, 以 15 分钟为间隔
 * @param {Array} messages
 * @returns {Conversation}
 */
export function extractLastConversation(messages) {
    const conversation = new Conversation()
    const descMessages = []
    // 从后向前遍历 messages，生成最近一次对话
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i]
        const lastMessageTime = new Date(message.createdAt)
        const previousMessageTime = new Date(messages[i - 1]?.createdAt) ?? 0
        //console.log(lastMessageTime, previousMessageTime)
        descMessages.push(message)
        if (lastMessageTime - previousMessageTime > 1000 * 60 * 15) {
            break
        }
    }
    descMessages.reverse().forEach((message) => {
        conversation.addMessage(message)
    })
    return conversation
}
