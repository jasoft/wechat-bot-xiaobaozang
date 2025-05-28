/**
 * Dify 图片理解功能
 *
 * 使用 Dify workflow API 上传图片并获取图片理解结果
 *
 * 重要配置说明：
 * 1. API Key: app-Z5gaMIwM32TKbu0tOZTXhR45 (已在代码中配置)
 * 2. 确保你的 Dify workflow 已正确配置图片输入节点
 * 3. workflow 的输入参数名称需要与代码中的匹配
 *
 * 使用示例：
 * ```javascript
 * import { imageUnderstanding } from './src/xunfei/imageunderstanding.js'
 *
 * const result = await imageUnderstanding('/path/to/image.jpg', '请描述这张图片')
 * console.log(result)
 * ```
 *
 * 注意事项：
 * - 支持的图片格式：JPG, PNG, GIF, WEBP
 * - 图片大小限制：通常不超过 10MB
 * - 确保图片文件路径正确且可访问
 */

import fs from "fs"
import dotenv from "dotenv"
import sharp from "sharp"
import logger from "../common/logger.js"
import axios from "axios"
import FormData from "form-data"

const env = dotenv.config().parsed // 环境

// Dify API 配置
const DIFY_API_KEY = env.DIFY_IMAGE_DESCRIBER_KEY
const DIFY_BASE_URL = env.DIFY_BASE_URL || "https://api.dify.ai" // 默认使用官方 API

export async function imageUnderstanding(imagePath, question) {
    try {
        // 首先上传文件到 Dify
        const fileId = await uploadFileToDify(imagePath)
        logger.info("File uploaded successfully, file ID:", fileId)

        // 然后使用 workflow API 处理图片理解
        const result = await runDifyWorkflow(fileId, question)

        return result
    } catch (error) {
        logger.error("Image understanding error:", error)
        throw error
    }
}

/**
 * 上传文件到 Dify
 * @param {string} imagePath - 图片文件路径
 * @returns {string} 文件ID
 */
async function uploadFileToDify(imagePath) {
    try {
        // 检查文件是否存在
        if (!fs.existsSync(imagePath)) {
            throw new Error(`File not found: ${imagePath}`)
        }

        // 创建 FormData
        const formData = new FormData()
        formData.append("file", fs.createReadStream(imagePath))
        formData.append("user", "apiuser")

        const response = await axios.post(`${DIFY_BASE_URL}/v1/files/upload`, formData, {
            headers: {
                Authorization: `Bearer ${DIFY_API_KEY}`,
                ...formData.getHeaders(),
            },
        })

        logger.debug("File upload response:", response.data)
        return response.data.id
    } catch (error) {
        logger.error("File upload error:", error.response?.data || error.message)
        throw new Error(`Failed to upload file: ${error.response?.data?.message || error.message}`)
    }
}

/**
 * 运行 Dify workflow 进行图片理解
 * @param {string} fileId - 上传的文件ID
 * @param {string} question - 用户问题
 * @returns {string} AI 回复
 */
async function runDifyWorkflow(fileId, question) {
    try {
        // 使用正确的文件对象格式
        const data = {
            inputs: {
                image: {
                    type: "image",
                    transfer_method: "local_file",
                    upload_file_id: fileId,
                },
                query: question || "请描述这张图片的内容",
            },
            response_mode: "blocking",
            user: "apiuser",
        }

        logger.debug("Sending workflow request with data:", JSON.stringify(data, null, 2))

        const response = await axios.post(`${DIFY_BASE_URL}/v1/workflows/run`, data, {
            headers: {
                Authorization: `Bearer ${DIFY_API_KEY}`,
                "Content-Type": "application/json",
            },
        })

        logger.debug("Workflow response:", response.data)

        // 从响应中提取结果
        if (response.data.data && response.data.data.outputs) {
            const outputs = response.data.data.outputs
            logger.debug("Workflow outputs:", outputs)
            // 尝试从不同可能的字段中获取结果
            const result = outputs.image_describe
            return result
        }

        return response.data.answer || response.data.result || "图片理解完成"
    } catch (error) {
        logger.error("Workflow execution error:", error.response?.data || error.message)

        throw new Error(`Failed to run workflow: ${error.response?.data?.message || error.message}`)
    }
}
