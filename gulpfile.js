import gulp from "gulp"
import watch from "gulp-watch"
import path from "path"
import { exec } from "child_process"
import iconv from "iconv-lite"

// 定义要监控的目录和排除的目录
const localDir = "." // 修改为你需要监控的目录
const remoteDir = "Q:\\wechat-bot-xiaobaozang"
const excludeDirs = ["node_modules", "assets", ".git", "coverage", "dist", "build", "logs"]

// 定义要监控的文件类型
const includeFiles = ["**/*.js", "**/*.json", "**/*.jsx", "**/*.ts", "**/*.tsx", ".env", "package.json"]

// 构建 rsync 选项
const rsyncOptions = {
    root: localDir,
    destination: remoteDir,
    archive: true,
    silent: true,
    compress: true,
    recursive: true,
    relative: true,
    exclude: excludeDirs,
}

// 防抖动函数
function debounce(func, wait) {
    let timeout
    return function (...args) {
        const context = this
        clearTimeout(timeout)
        timeout = setTimeout(() => func.apply(context, args), wait)
    }
}

// rsync 同步函数
const syncFiles = debounce(() => {
    // 先设置代码页为 GBK (936)
    exec("chcp 936", { encoding: "utf8" }, (error) => {
        if (error) {
            console.error("设置编码失败:", error)
            return
        }

        const robocopyCmd = `robocopy ${localDir} ${remoteDir}  /E /XD ${excludeDirs.join(" ")}`
        console.log("开始同步:", robocopyCmd)

        exec(robocopyCmd, { encoding: "buffer" }, (error, stdout, stderr) => {
            // 使用 GBK 解码输出
            const output = iconv.decode(stdout, "gbk")

            if (output.trim()) {
                console.log("同步输出:\n", output)
            } else {
                console.log("同步执行完成，但没有输出")
            }

            if (stderr) {
                console.error("同步警告:", iconv.decode(stderr, "gbk"))
            }
        })
    })
}, 2000)

// 清理资源的函数
function cleanup() {
    if (global.watchInstance) {
        global.watchInstance.close()
    }
}

// 监控文件变化并同步
gulp.task("watch", () => {
    // 确保在进程退出时清理资源
    process.on("SIGINT", cleanup)
    process.on("SIGTERM", cleanup)

    // 保存 watch 实例以便后续清理
    global.watchInstance = watch(
        includeFiles.map((pattern) => path.join(localDir, pattern)),
        {
            ignored: excludeDirs.map((dir) => path.join(localDir, dir)),
            dot: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 1000,
                pollInterval: 100,
            },
        },
        syncFiles
    )
})

// 默认任务
gulp.task("default", gulp.series("watch"))

// 导出清理函数供外部使用
export { cleanup }
