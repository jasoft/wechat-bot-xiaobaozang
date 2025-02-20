const gulp = require("gulp")
const watch = require("gulp-watch")
const rsync = require("gulp-rsync")
const path = require("path")
const { exec } = require("child_process")
const iconv = require("iconv-lite")

// 定义要监控的目录和排除的目录
const localDir = "." // 修改为你需要监控的目录
const remoteDir = "Q:\\wechat-bot-xiaobaozang"
const excludeDirs = ["node_modules", "assets", ".git"]

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

        const robocopyCmd = `robocopy ${localDir} ${remoteDir} /NFL /NDL /NJH /NJS /E /XD ${excludeDirs.join(" ")}`

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

// 监控文件变化并同步
gulp.task("watch", () => {
    watch(
        [`${localDir}/**/*`, `${localDir}/.env`],
        { ignored: excludeDirs.map((dir) => path.join(localDir, dir)), dot: true },
        syncFiles
    )
})

// 默认任务
gulp.task("default", gulp.series("watch"))
