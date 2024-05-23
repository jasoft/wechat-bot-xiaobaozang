import Summarizer from "../summarize" // 路径根据实际情况修改

describe("Summarizer", () => {
	let summarizer

	beforeEach(() => {
		summarizer = new Summarizer()
	})

	it("should return a summary for the given content", async () => {
		await summarizer.summarizeContentByTopicId()

		// Mock AIReplyHandler to return a fixed response
	}, 30000)
})
