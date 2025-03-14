import axios from "axios"
import fs from "fs"
import logger from "./logger.js"
import os from "os"
import path from "path"

// 使用 axios 模块
export async function downloadFile(url, filePath) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
    const writer = fs.createWriteStream(filePath)
    writer.on("error", (err) => {
        console.error("写入时出错:", err)
    })
    try {
        const response = await axios({
            url,
            method: "GET",
            responseType: "stream",
        })

        response.data.pipe(writer)

        return new Promise((resolve, reject) => {
            writer.on("finish", resolve)
            writer.on("error", (err) => {
                fs.unlink(filePath, () => {}) // 删除文件
                reject(err)
            })
        })
    } catch (error) {
        console.error("Error downloading file:", error.message)
        throw error
    }
}

export async function downloadAndConvertToBase64(url) {
    const targetName = `${os.tmpdir()}/${Date.now()}.tmp`
    logger.debug("downloadAndConvertToBase64 targetName: ", targetName)
    // Generate a temporary file name
    await downloadFile(url, targetName)

    const fileData = fs.readFileSync(targetName, { encoding: "base64" })
    fs.unlinkSync(targetName) // 删除
    return fileData
}
