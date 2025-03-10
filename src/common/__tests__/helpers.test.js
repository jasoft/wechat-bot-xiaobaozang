// 引入要测试的函数
import { downloadFile, downloadAndConvertToBase64 } from "../helpers.js"
import fs from "fs"
import path from "path"

describe("downloadFile without mocking", () => {
    const targetName = path.join(process.cwd(), "storage", "tempfile")
    const url = "https://sample-videos.com/img/Sample-png-image-100kb.png" // 确保这是一个有效且可以公开访问的URL
    console.log(url)

    afterAll(() => {
        // 测试完成后清理下载的文件
        fs.unlinkSync(targetName)
    })

    it("should download file and save it", async () => {
        await downloadFile(url, targetName)

        // 检查文件是否存在
        expect(fs.existsSync(targetName)).toBe(true)
    })

    it("should download file and convert it to base64", async () => {
        const base64 = await downloadAndConvertToBase64(url)
        expect(base64).toBeTruthy()
        console.log(base64)
    })
    // 检查文件是否存在
}, 30000)
