import { execSync } from "child_process"

function extractPathFromMessage(message) {
	const path = message.content.match(/\{(.*)\}/)[1]
	return path
}
/**
 * 处理图片消息
 *
 * @param  lastUserMessage 上一条用户消息,格式为:{role:"user", content:"[图片消息]{图片路径}"}
 * @returns {Promise} 返回图片理解结果
 */
export async function getImageRecognitionText(lastUserMessage) {
	const imagePath = extractPathFromMessage(lastUserMessage)
	//logger.info(imagePath)
	return imageUnderstanding(imagePath, env.IMAGE_UNDERSTANDING_PROMPT)
}

/**
 * 处理语音消息
 *
 * @param  lastUserMessage 上一条用户消息,格式为:{role:"user", content:"[图片消息]{图片路径}"}
 * @returns {Promise} 返回图片理解结果
 */
export async function getVoiceRecognitionText(lastUserMessage) {
	const voicePath = extractPathFromMessage(lastUserMessage)
	let pcmFilePath
	if (voicePath.endsWith(".mp3")) {
		pcmFilePath = await mp32pcm(voicePath)
	} else if (voicePath.endsWith(".sil")) {
		pcmFilePath = await sil2pcm(voicePath)
	} else {
		logger.error("语音文件格式不正确")
		return "语音文件格式不正确"
	}

	return recognizeAudio(pcmFilePath)
}

async function sil2pcm(voicePath) {
	const pcmFilePath = voicePath.replace(".sil", ".pcm")

	const ffmpegCommand = `ffmpeg -loglevel quiet -y -i ${voicePath} -f s16le -acodec pcm_s16le ${pcmFilePath}`

	execSync(ffmpegCommand, (error, stdout, stderr) => {
		if (error) {
			logger.error(`执行ffmpeg命令失败: ${error}`)
			return
		}

		logger.debug(`Silk文件已成功转换为PCM格式: ${pcmFilePath}`)
	})
	return pcmFilePath
}

async function mp32pcm(voicePath) {
	const pcmFilePath = voicePath.replace(".mp3", ".pcm")

	const ffmpegCommand = `ffmpeg -loglevel quiet -y -i ${voicePath} -f s16le -acodec pcm_s16le ${pcmFilePath}`

	execSync(ffmpegCommand, (error, stdout, stderr) => {
		if (error) {
			logger.error(`执行ffmpeg命令失败: ${error}`)
			return
		}

		logger.debug(`MP3文件已成功转换为PCM格式: ${pcmFilePath}`)
	})

	return pcmFilePath
}
