// 引入要测试的函数
import { downloadFile, downloadAndConvertToBase64 } from "./helpers.js"
import fs from "fs"
import path from "path"

describe("downloadFile without mocking", () => {
    const targetName = path.join(process.cwd(), "storage", "tempfile")
    const url =
        "http://dify.docker.home/files/tools/b39fd264-2e02-4981-acbe-af07490c6700.png?timestamp=1720363075&nonce=ca006888cd2af48be71978f58f8f4423&sign=HcU3VbZM2NUyq7ttAydHksWeIRzQX12xVUDL_O0itd0=" // 确保这是一个有效且可以公开访问的URL
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
})
