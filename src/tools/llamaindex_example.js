import { Groq, Document, VectorStoreIndex, Settings } from "llamaindex"

import fs from "node:fs/promises"
import dotenv from "dotenv"
dotenv.config()

// Use the OpenAI LLM

Settings.llm = new Groq({
	apiKey: process.env.GROQ_API_KEY,
	model: "llama-70b-8192",
	temperature: 0,
})

async function main() {
	const path = "node_modules/llamaindex/examples/abramov.txt"

	const essay = await fs.readFile(path, "utf-8")
	const document = new Document({ text: essay, id_: "essay" })

	// Load and index documentsrs
	const index = await VectorStoreIndex.fromDocuments([document])

	// get retriever
	const retriever = index.asRetriever()

	// Create a query engine
	const queryEngine = index.asQueryEngine({
		retriever,
	})

	const query = "What is the meaning of life?"

	// Query
	const response = await queryEngine.query({
		query,
	})

	// Log the response
	console.log(response.response)
}

await main()
