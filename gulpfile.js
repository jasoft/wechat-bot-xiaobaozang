const gulp = require("gulp")
const watch = require("gulp-watch")
const rsync = require("gulp-rsync")
const path = require("path")

// 定义要监控的目录和排除的目录
const localDir = "." // 修改为你需要监控的目录
const remoteDir = "/Volumes/Users/soj/Projects/wechat-bot-xiaobaozang"
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
	gulp.src(localDir)
		.pipe(rsync(rsyncOptions))
		.on("error", (error) => console.error("Error:", error))
}, 2000) // 设置防抖动等待时间为 2 秒

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
