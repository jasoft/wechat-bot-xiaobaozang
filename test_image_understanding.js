#!/usr/bin/env node
import { imageUnderstanding } from "./src/xunfei/imageunderstanding.js"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function testImageUnderstanding() {
    try {
        // 使用现有的测试图片
        const imagePath = path.join(__dirname, "coverage/lcov-report/favicon.png")
        const question = "请描述这张图片的内容"

        console.log("开始测试图片理解...")
        console.log("图片路径:", imagePath)
        console.log("问题:", question)

        const result = await imageUnderstanding(imagePath, question)

        console.log("结果:", result)
    } catch (error) {
        console.error("测试失败:", error.message)
    }
}

// 如果直接运行此文件，则执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
    testImageUnderstanding()
}
