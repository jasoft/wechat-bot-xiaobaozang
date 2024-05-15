import GroqClient from "groq-sdk"
import dotenv from "dotenv"
const env = dotenv.config().parsed // 环境参数

const client = new GroqClient({
	apiKey: env.GROQ_API_KEY,
})

const MODEL = "llama3-70b-8192"

// 模拟的获取 NBA 比赛得分的函数
async function get_game_score(team_name) {
	let response
	if (team_name.toLowerCase().includes("warriors")) {
		response = {
			game_id: "401585601",
			status: "Final",
			home_team: "Los Angeles Lakers",
			home_team_score: 121,
			away_team: "Golden State Warriors",
			away_team_score: 128,
		}
	} else if (team_name.toLowerCase().includes("lakers")) {
		response = {
			game_id: "401585601",
			status: "Final",
			home_team: "Los Angeles Lakers",
			home_team_score: 121,
			away_team: "Golden State Warriors",
			away_team_score: 128,
		}
	} else if (team_name.toLowerCase().includes("nuggets")) {
		response = {
			game_id: "401585577",
			status: "Final",
			home_team: "Miami Heat",
			home_team_score: 88,
			away_team: "Denver Nuggets",
			away_team_score: 100,
		}
	} else if (team_name.toLowerCase().includes("heat")) {
		response = {
			game_id: "401585577",
			status: "Final",
			home_team: "Miami Heat",
			home_team_score: 88,
			away_team: "Denver Nuggets",
			away_team_score: 100,
		}
	} else {
		response = { team_name: team_name, score: "unknown" }
	}
	return JSON.stringify(response)
}

// 运行对话
async function runConversation(user_prompt) {
	const messages = [
		{
			role: "system",
			content:
				"你是一个调用 LLM 的函数，它使用从 get_game_score 函数提取的数据来回答关于 NBA 比赛得分的问题。在你的回答中包含球队和对手的信息。 用中文回复所有问题.",
		},
		{
			role: "user",
			content: user_prompt,
		},
	]
	const tools = [
		{
			type: "function",
			function: {
				name: "get_game_score",
				description: "获取一个指定的 NBA 球队的分数",
				parameters: {
					type: "object",
					properties: {
						team_name: {
							type: "string",
							description: "NBA 球队名称(比如金州勇士队)",
						},
					},
					required: ["team_name"],
				},
			},
		},
		{
			type: "function",
			function: {
				name: "",
				description: "Get the score for a given NBA game",
				parameters: {
					type: "object",
					properties: {
						team_name: {
							type: "string",
							description: "The name of the NBA team (e.g. 'Golden State Warriors')",
						},
					},
					required: ["team_name"],
				},
			},
		},
	]

	const response = await client.chat.completions.create({
		model: MODEL,
		messages: messages,
		tools: tools,
		tool_choice: "auto",
		max_tokens: 4096,
	})

	const responseMessage = response.choices[0].message
	const toolCalls = responseMessage.tool_calls
	if (toolCalls) {
		const availableFunctions = {
			get_game_score: get_game_score,
		}
		messages.push(responseMessage)
		for (const toolCall of toolCalls) {
			const functionName = toolCall.function.name
			const functionToCall = availableFunctions[functionName]
			const functionArgs = JSON.parse(toolCall.function.arguments)
			const functionResponse = await functionToCall(functionArgs.team_name)
			messages.push({
				tool_call_id: toolCall.id,
				role: "tool",
				name: functionName,
				content: functionResponse,
			})
		}
		const secondResponse = await client.chat.completions.create({
			model: MODEL,
			messages: messages,
		})
		const engResponse = secondResponse.choices[0].message.content
		const finalResponse = await client.chat.completions.create({
			model: MODEL,
			messages: [
				{
					role: "user",
					content: `把这句话翻译成中文: ${engResponse}`,
				},
			],
		})
		return finalResponse.choices[0].message.content
	}
}

const userPrompt = "勇士队的分数是多少？"
runConversation(userPrompt)
	.then((response) => {
		console.log(response)
	})
	.catch((error) => {
		console.error(error)
	})
