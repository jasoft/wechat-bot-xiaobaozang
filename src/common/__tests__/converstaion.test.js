import { Conversation, extractLastConversation } from "../conversation.js" // 假设你的文件名是 conversation.js

const messages = [
	{ text: "good bye!", role: "assistant", createdAt: new Date() - 20 * 60 * 1000 },
	{ text: "Hello", role: "user", createdAt: new Date() - 10000 },
	{ text: "Hi, this is bot", role: "assistant", createdAt: new Date() - 9000 },
	{ text: "tell me a joke", role: "user", createdAt: new Date() - 8000 },
	{ text: "sure, this is a joke, bla...", role: "assistant", createdAt: new Date() - 0 },
]

test("extractLastConversation returns a conversation", () => {
	const conversation = extractLastConversation(messages)
	expect(conversation.getMessages()).toEqual(messages.slice(-4))
})

describe("Conversation", () => {
	let conversation

	beforeEach(() => {
		conversation = new Conversation()
	})

	test("addMessage adds a message", () => {
		conversation.addMessage({ text: "Hello", role: "user" })
		expect(conversation.getMessages()).toEqual([{ text: "Hello", role: "user" }])
	})

	test("getMessages returns all messages", () => {
		conversation.addMessage({ text: "Hello", role: "user" })
		conversation.addMessage({ text: "Hi", role: "assistant" })
		expect(conversation.getMessages()).toEqual([
			{ text: "Hello", role: "user" },
			{ text: "Hi", role: "assistant" },
		])
	})

	test("getLastMessage returns the last message", () => {
		conversation.addMessage({ text: "First", role: "user" })
		conversation.addMessage({ text: "Last", role: "assistant", createdAt: new Date() - 1000 * 60 * 5 })
		expect(conversation.getLastMessage().text).toEqual("Last")
	})

	test("getFirstMessage returns the first message", () => {
		conversation.addMessage({ text: "First", role: "user" })
		conversation.addMessage({ text: "Second", role: "assistant" })
		expect(conversation.getFirstMessage()).toEqual({ text: "First", role: "user" })
	})

	test("getLastRoleMessage returns the last message of a given role", () => {
		conversation.addMessage({ text: "User1", role: "user" })
		conversation.addMessage({ text: "assistant", role: "assistant" })
		conversation.addMessage({ text: "User2", role: "user" })
		expect(conversation.getLastRoleMessage("user")).toEqual({ text: "User2", role: "user" })
		expect(conversation.getLastRoleMessage("assistant")).toEqual({ text: "assistant", role: "assistant" })
	})

	test("getFirstRoleMessage returns the first message of a given role", () => {
		conversation.addMessage({ text: "User", role: "user" })
		conversation.addMessage({ text: "assistant1", role: "assistant" })
		conversation.addMessage({ text: "assistant2", role: "assistant" })
		expect(conversation.getFirstRoleMessage("assistant")).toEqual({ text: "assistant1", role: "assistant" })
	})
})
