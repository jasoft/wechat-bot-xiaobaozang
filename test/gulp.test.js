import { exec } from "child_process"
import fs from "fs/promises"
import path from "path"
import { promisify } from "util"
import iconv from "iconv-lite"

const execAsync = promisify(exec)

describe("Robocopy Chinese Output Test", () => {
    const testDir = path.join(__dirname, "test-files")
    const targetDir = path.join(__dirname, "target-files")

    beforeEach(async () => {
        // 清理并创建测试目录
        await fs.rm(testDir, { recursive: true, force: true })
        await fs.rm(targetDir, { recursive: true, force: true })
        await fs.mkdir(testDir, { recursive: true })
        await fs.mkdir(targetDir, { recursive: true })
    })

    afterAll(async () => {
        // 清理测试目录
        await fs.rm(testDir, { recursive: true, force: true })
        await fs.rm(targetDir, { recursive: true, force: true })
    })

    test("应该正确处理中文文件名复制", async () => {
        // 创建测试文件
        const testFileName = "测试文件.txt"
        const testContent = "测试内容"
        await fs.writeFile(path.join(testDir, testFileName), testContent)

        // 先设置代码页为 GBK
        await execAsync("chcp 936", { encoding: "utf8" })

        // 执行 robocopy 并获取 buffer 输出
        const result = await new Promise((resolve, reject) => {
            exec(
                `robocopy "${testDir}" "${targetDir}" /E`,
                { encoding: "buffer" }, // 使用 buffer 编码
                (error, stdout, stderr) => {
                    if (error && ![0, 1].includes(error?.code)) {
                        reject(error)
                        return
                    }
                    // 使用 iconv-lite 解码 GBK 输出
                    const output = iconv.decode(stdout, "gbk")
                    resolve(output)
                }
            )
        })

        console.log("Robocopy Output:", result) // 输出解码后的内容

        // 验证文件是否正确复制
        const copiedFiles = await fs.readdir(targetDir)
        expect(copiedFiles).toContain(testFileName)

        // 验证文件内容
        const copiedContent = await fs.readFile(path.join(targetDir, testFileName), "utf8")
        expect(copiedContent).toBe(testContent)

        // 验证输出是否包含中文（现在应该可以正确匹配了）
        expect(result).toContain(testFileName)
    }, 10000) // 设置更长的超时时间
})
