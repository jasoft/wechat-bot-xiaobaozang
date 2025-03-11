import Koa from "koa"
import Router from "koa-router"
import bodyParser from "koa-bodyparser"
import { koaSwagger } from "koa2-swagger-ui"
import cors from "koa2-cors"
import { wxClient } from "./wxmessage.js"
import rootLogger from "./logger.js"
import spec from "./swagger.json" assert { type: "json" }
import { queryAI } from "../wcf/index.js"
import { messageQueue } from "./queue.js"

const logger = rootLogger.getLogger("API")
// Helper functions
export function createResponseBody(message, code, recipient, text) {
    return { message, code, recipient, text }
}

// Route handlers
export async function handleMessagePost(ctx) {
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
}

export async function handleToolCallPost(ctx) {
    const { recipient, message } = ctx.request.body
    try {
        messageQueue.enqueue({
            id: "toolcall_" + Date.now(),
            type: 1, // 1=文本, 3=图片, 34=语音
            sender: process.env.BOT_ID,
            content: message,
            roomId: wxClient.getContactId(recipient),
        })
        ctx.body = `微信消息"${message}"成功发送给"${recipient}"啦! `
    } catch (error) {
        ctx.body = `发送消息出错啦, 重新试一下吧`
    }
}

export async function handleMessageGet(ctx) {
    ctx.body = { code: 200, message: "一个发送微信的 api" }
}

export async function handleReminderCallback(ctx) {
    logger.info("reminder callback", ctx.request.body)
    const notifyEvents = ctx.request.body.reminders_notified
    let promises = notifyEvents.map((notifyEvent) => {
        logger.info("notifyEvent", notifyEvent)
        return queryAI("reminder/callback", [{ role: "user", content: notifyEvent.title }])
    })

    try {
        let results = await Promise.all(promises)
        let responses = results.map((res) => res.response)
        ctx.body = { code: 200, message: responses }
        logger.info("reply from ai", responses)
    } catch (error) {
        logger.error("error", error)
        ctx.status = 500
        ctx.body = { code: 500, message: "Internal server error" }
    }
}

// Create Koa app and router
export function createApp() {
    const app = new Koa()
    const router = new Router()

    // Middleware
    app.use(cors())
    app.use(bodyParser())
    app.use(router.routes())
    app.use(router.allowedMethods())

    // Routes
    router.post("/message", handleMessagePost)
    router.post("/message/toolcall", handleToolCallPost)
    router.get("/message", handleMessageGet)
    router.post("/reminder/callback", handleReminderCallback)

    // Swagger UI
    app.use(
        koaSwagger({
            routePrefix: "/swagger",
            swaggerOptions: {
                spec: spec,
            },
        })
    )

    return app
}

// Start server
export async function startApiServer() {
    const app = createApp()

    app.listen(process.env.API_PORT, () => {
        logger.info(`API Server is running on port ${process.env.API_PORT}`)
    })

    return app
}
