"use strict"
import { execSync } from "child_process"
import { imageUnderstanding } from "../xunfei/imageunderstanding.js"
import { recognizeAudio } from "../xunfei/voicerecog.js"

import { Wcferry } from "@zippybee/wechatcore"
import rootlogger from "./logger.js"

const logger = rootlogger.getLogger("wxmessage")

class WcferryEx extends Wcferry {
    constructor(options) {
        super(options)
        logger.debug(options)
    }

    getContactId(receiver) {
        const contactId = this.getContacts().find((item) => item.remark === receiver || item.name === receiver)?.wxid
        if (contactId) {
            logger.debug("WXMessage", `contactId for ${receiver}: ${contactId}`)
        } else {
            logger.error("WXMessage", `No contact found for ${receiver}`)
            throw new Error(`No contact found for ${receiver}`)
        }
        return contactId
    }

    getContact(wxid) {
        return this.getContacts().find((item) => item.wxid === wxid)
    }

    sendTxtByName(msg, receiver, aters) {
        if (this.sendTxt(msg, this.getContactId(receiver), aters) != 0)
            throw new Error(`Send wechat message to ${receiver} with ${msg} failed.`)
    }
}

function startClientWithRetry(retries = 3, delay = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            const client = new WcferryEx({ host: process.env.WCF_HOST, port: parseInt(process.env.WCF_PORT) })
            client.start()
            setTimeout(() => {}, 2000)
            const isLogin = client.isLogin()
            const userinfo = client.getUserInfo()

            logger.debug(`Login status: ${isLogin}, User info: ${JSON.stringify(userinfo)}, wxid: ${userinfo?.wxid}`)
            logger.info("Wcferry client started at", process.env.WCF_HOST, process.env.WCF_PORT)
            return client
        } catch (error) {
            logger.error(
                `Failed to start Wcferry client[${process.env.WCF_HOST}:${process.env.WCF_PORT}]: ${error.message}. Retrying in ${delay / 1000} seconds...`
            )
            if (i < retries - 1) {
                setTimeout(() => {}, delay)
            } else {
                throw error
            }
        }
    }
}

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
    return imageUnderstanding(imagePath, process.env.IMAGE_UNDERSTANDING_PROMPT)
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

export const wxClient = startClientWithRetry()
