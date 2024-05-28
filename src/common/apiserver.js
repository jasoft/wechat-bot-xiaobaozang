import Koa from "koa"
import Router from "koa-router"
import bodyParser from "koa-bodyparser"
import { koaSwagger } from "koa2-swagger-ui"
import { wxclient } from "./wxmessage.js"
import logger from "./logger.js"
import path from "path"
import spec from "./swagger.json"
// 使用 Swagger UI 中间件来提供 API 文档

export async function startApiServer() {
	const app = new Koa()
	const router = new Router()
	app.use(bodyParser())
	app.use(router.routes())
	app.use(router.allowedMethods())

	router.post("/message", (ctx) => {
		const { recipient, message } = ctx.request.body
		if (!recipient || !message) {
			ctx.code = 400
			ctx.body = { error: "Recipient and message are required." }
		}

		try {
			wxclient.sendTxtByName(message, recipient)
			ctx.body = { message: "Message sent successfully" }
		} catch (error) {
			ctx.code = 500
			ctx.body = { error: "Error sending message." }
		}
	})
	router.get("/message", (ctx) => {
		// 实现获取用户的逻辑
		ctx.body = { code: 200, message: "一个发送微信的 api" }
	})

	// 使用 Swagger UI 中间件来提供 API 文档
	app.use(
		koaSwagger({
			routePrefix: "/swagger", // host at /swagger instead of default /docs
			swaggerOptions: {
				spec: spec,
			},
		})
	)

	app.listen(process.env.API_PORT, () => {
		logger.info(`API Server is running on port ${process.env.API_PORT}`)
	})
	// 使用 Swagger UI 中间件来提供 API 文档
}
