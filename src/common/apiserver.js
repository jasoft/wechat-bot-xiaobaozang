import express from "express"
import swaggerUi from "swagger-ui-express"
import swaggerDocument from "./swagger.json" // 这是你的 Swagger 文档
import { wxclient } from "./wxmessage.js"
import logger from "./logger.js"
// 使用 Swagger UI 中间件来提供 API 文档

export async function startApiServer() {
	const app = express()
	app.use(express.json()) // for parsing application/json

	app.post("/message", async (req, res) => {
		const { recipient, message } = req.body
		if (!recipient || !message) {
			return res.status(400).json({ error: "Recipient and message are required." })
		}

		try {
			wxclient.sendTxtByName(message, recipient)
			res.json({ success: true })
		} catch (error) {
			res.status(500).json({ error: "Error sending message." })
		}
	})
	app.get("/message", async (req, res) => {
		// 实现获取用户的逻辑
		res.json({ code: 200, message: "一个发送微信的 api" })
	})
	app.listen(process.env.API_PORT, () => {
		logger.info(`API Server is running on port ${process.env.API_PORT}`)
	})
	app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))
}
