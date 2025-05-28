import gulp from "gulp"
import watch from "gulp-watch"
import path from "path"
import { exec } from "child_process"
import os from "os"

// 定义要监控的目录和排除的目录
const localDir = "." // 修改为你需要监控的目录
const remoteDir = "/Volumes/Users/soj/Projects/wechat-bot-xiaobaozang" // 修改为你的远程目录路径
const excludeDirs = ["node_modules", "assets", ".git", "coverage", "dist", "build", "logs"]

// 定义要监控的文件类型
const includeFiles = ["**/*.js", "**/*.json", "**/*.jsx", "**/*.ts", "**/*.tsx", ".env", "package.json"]

// 防抖动函数
function debounce(func, wait) {
    let timeout
    return function (...args) {
        const context = this
        clearTimeout(timeout)
        timeout = setTimeout(() => func.apply(context, args), wait)
    }
}

// 检测操作系统类型
function getOS() {
    const platform = os.platform()
    if (platform === "darwin") return "macOS"
    if (platform === "linux") return "Linux"
    return platform
}

// rsync 同步函数
const syncFiles = debounce(() => {
    // 构建排除目录参数，确保正确的格式
    const excludeArgs = excludeDirs.map((dir) => `--exclude=${dir}/`).join(" ")

    // 使用 rsync 命令进行同步（只复制更新的文件，不删除目标文件）
    // 添加 --exclude='.*' 来排除隐藏文件，但保留 .env 文件
    const rsyncCmd = `rsync -av ${excludeArgs} --include='.env' ${localDir}/ ${remoteDir}/`

    console.log(`开始同步 (${getOS()}):\n${rsyncCmd}`)

    exec(rsyncCmd, { encoding: "utf8" }, (error, stdout, stderr) => {
        if (error) {
            console.error("同步失败:", error.message)
            return
        }

        if (stdout.trim()) {
            console.log("同步输出:\n", stdout)
        } else {
            console.log("同步执行完成，没有文件需要更新")
        }

        if (stderr) {
            console.error("同步警告:", stderr)
        }
    })
}, 2000)

// 清理资源的函数
function cleanup() {
    if (global.watchInstance) {
        console.log("正在清理监控资源...")
        global.watchInstance.close()
    }
    process.exit(0)
}

// 监控文件变化并同步
gulp.task("watch", () => {
    console.log(`启动文件监控服务 (${getOS()})...`)
    console.log(`本地目录: ${path.resolve(localDir)}`)
    console.log(`远程目录: ${remoteDir}`)
    console.log(`监控文件类型: ${includeFiles.join(", ")}`)
    console.log(`排除目录: ${excludeDirs.join(", ")}`)

    // 确保在进程退出时清理资源
    process.on("SIGINT", cleanup)
    process.on("SIGTERM", cleanup)
    process.on("SIGQUIT", cleanup)

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
        (vinyl) => {
            console.log(`文件变化: ${vinyl.path}`)
            syncFiles()
        }
    )

    console.log("文件监控已启动，按 Ctrl+C 停止...")
})

// 手动同步任务
gulp.task("sync", (done) => {
    console.log("执行手动同步...")
    syncFiles()
    setTimeout(done, 3000) // 等待同步完成
})

// 测试连接任务
gulp.task("test", (done) => {
    console.log("测试 rsync 连接...")

    const excludeArgs = excludeDirs.map((dir) => `--exclude=${dir}/`).join(" ")
    const testCmd = `rsync --dry-run -av ${excludeArgs} --exclude='.*' --include='.env' ${localDir}/ ${remoteDir}/`
    console.log(`测试命令: ${testCmd}`)

    exec(testCmd, { encoding: "utf8" }, (error, stdout, stderr) => {
        if (error) {
            console.error("连接测试失败:", error.message)
            console.log("请检查:")
            console.log("1. 远程目录路径是否正确")
            console.log("2. 是否有访问权限")
            console.log("3. 如果是网络路径，是否已正确挂载")
        } else {
            console.log("连接测试成功!")
            if (stdout.trim()) {
                console.log("预计同步文件:")
                console.log(stdout)
            }
        }

        if (stderr) {
            console.log("警告信息:", stderr)
        }

        done()
    })
})

// 默认任务
gulp.task("default", gulp.series("watch"))

// 导出清理函数供外部使用
export { cleanup }
