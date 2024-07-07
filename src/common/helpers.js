import axios from "axios"
import fs from "fs"
import logger from "./logger.js"
const os = require("os")

// 使用 axios 模块
export async function downloadFile(url, filePath) {
    const writer = fs.createWriteStream(filePath)

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
