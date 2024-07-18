import Koa from "koa"
import cors from "koa2-cors"
import Router from "koa-router"
import bodyParser from "koa-bodyparser"
import { koaSwagger } from "koa2-swagger-ui"
import { wxClient } from "./wxmessage.js"
import logger from "./logger.js"
import path from "path"
import spec from "./swagger.json"
import { queryAI } from "../wcf/index.js"
import { searchChatLog } from "./search.js"
// 使用 Swagger UI 中间件来提供 API 文档

export async function startApiServer() {
    const app = new Koa()
    const router = new Router()
    app.use(cors())
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
            wxClient.sendTxtByName(message, recipient)

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
            wxClient.sendTxtByName(message, recipient)

            ctx.body = `微信消息"${message}"成功发送给"${recipient}"啦! `
        } catch (error) {
            ctx.body = `发送消息出错啦, 重新试一下吧`
            logger.error("/message/toolcall", error)
        }
    })

    router.get("/message", (ctx) => {
        // 实现获取用户的逻辑
        ctx.body = { code: 200, message: "一个发送微信的 api" }
    })

    router.get("/message/search", async (ctx) => {
        // 搜索聊天记录
        const { topicId, keyword } = ctx.query
        ctx.body = { code: 200, data: await searchChatLog(topicId, keyword) }
    })

    // 收到 reminder-api 的提醒， 调用 bot 发送消息
    router.post("/reminder/callback", async (ctx) => {
        logger.info("reminder callback", ctx.request.body)
        const notifyEvents = ctx.request.body.reminders_notified
        let promises = notifyEvents.map((notifyEvent) => {
            return queryAI("reminder/callback", [{ role: "user", content: notifyEvent.title }])
        })

        try {
            let results = await Promise.all(promises)
            let responses = results.map((res) => res.response)
            ctx.body = { code: 200, message: responses }
            logger.info("reply from ai", responses)
        } catch (error) {
            // handle error here
            logger.error("error", error)
        }
    })
    // 使用 Swagger UI 中间件来提供 API 文档Empty Clipboard Text
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
