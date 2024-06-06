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
	function createResponseBody(message, code, recipient, text) {
		return { message, code, recipient, text }
	}
	router.post("/message", (ctx) => {
		const { recipient, message } = ctx.request.body

		if (!recipient || !message) {
			ctx.status = 400
			ctx.body = createResponseBody("Recipient and message are required.", 400, recipient, message)
			return
		}

		try {
			wxclient.sendTxtByName(message, recipient)

			ctx.body = createResponseBody("Message sent successfully", 200, recipient, message)
		} catch (error) {
			ctx.status = 400
			ctx.body = createResponseBody("Error sending message.", 400, null, error.message)
		}
	})

	// 实现一个发送微信的 API工具,返回人类友好的消息, 供各种 bot 调用
	router.post("/message/toolcall", (ctx) => {
		const { recipient, message } = ctx.request.body

		try {
			wxclient.sendTxtByName(message, recipient)

			ctx.body = `微信消息"${message}"成功发送给"${recipient}"啦! `
		} catch (error) {
			ctx.body = `发送消息出错啦, 重新试一下吧`
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
