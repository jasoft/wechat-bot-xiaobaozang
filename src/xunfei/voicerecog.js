import fs from 'fs'
import WebSocket from 'ws'
import CryptoJS from 'crypto-js'
import dotenv from 'dotenv'

const env = dotenv.config().parsed // 环境参数

const appID = env.XUNFEI_APP_ID
const apiKey = env.XUNFEI_API_KEY
const apiSecret = env.XUNFEI_API_SECRET
// 系统配置
const config = {
  // 请求地址
  hostUrl: 'wss://iat-api.xfyun.cn/v2/iat',
  host: 'iat-api.xfyun.cn',
  //在控制台-我的应用-语音听写（流式版）获取
  appid: appID,
  //在控制台-我的应用-语音听写（流式版）获取
  apiSecret: apiSecret,
  //在控制台-我的应用-语音听写（流式版）获取
  apiKey: apiKey,
  uri: '/v2/iat',
  highWaterMark: 1280,
}

// 帧定义
const FRAME = {
  STATUS_FIRST_FRAME: 0,
  STATUS_CONTINUE_FRAME: 1,
  STATUS_LAST_FRAME: 2,
}

// 获取鉴权签名
function getAuthStr(date) {
  const signatureOrigin = `host: ${config.host}\ndate: ${date}\nGET ${config.uri} HTTP/1.1`
  const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, config.apiSecret)
  const signature = CryptoJS.enc.Base64.stringify(signatureSha)
  const authorizationOrigin = `api_key="${config.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
  const authStr = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authorizationOrigin))
  return authStr
}

// 传输数据
function send(ws, data, status) {
  const frame = {
    data: {
      status,
      format: 'audio/L16;rate=16000',
      audio: data.toString('base64'),
      encoding: 'raw',
    },
  }

  if (status === FRAME.STATUS_FIRST_FRAME) {
    frame.common = {
      app_id: config.appid,
    }
    frame.business = {
      language: 'zh_cn',
      domain: 'iat',
      accent: 'mandarin',
      dwa: 'wpgs', // 可选参数，动态修正
    }
  }

  ws.send(JSON.stringify(frame))
}

export const recognizeAudio = async (filePath) => {
  let status = FRAME.STATUS_FIRST_FRAME
  let currentSid = ''
  let iatResult = []

  const date = new Date().toUTCString()
  const wssUrl = `${config.hostUrl}?authorization=${getAuthStr(date)}&date=${date}&host=${config.host}`
  const ws = new WebSocket(wssUrl)

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('websocket connect!')
      const readerStream = fs.createReadStream(filePath, {
        highWaterMark: config.highWaterMark,
      })

      readerStream.on('data', (chunk) => {
        send(ws, chunk, status)
        status = FRAME.STATUS_CONTINUE_FRAME
      })

      readerStream.on('end', () => {
        status = FRAME.STATUS_LAST_FRAME
        send(ws, '', status)
      })
    })

    ws.on('message', (data) => {
      const res = JSON.parse(data)
      if (res.code !== 0) {
        console.log(`error code ${res.code}, reason ${res.message}`)
        reject(res.message)
        return
      }

      let str = ''
      if (res.data.status === 2) {
        str += '最终识别结果'
        currentSid = res.sid
        ws.close()
      } else {
        str += '中间识别结果'
      }

      iatResult[res.data.result.sn] = res.data.result
      if (res.data.result.pgs === 'rpl') {
        res.data.result.rg.forEach((i) => {
          iatResult[i] = null
        })
        str += '【动态修正】'
      }

      str += '：'
      iatResult.forEach((i) => {
        if (i !== null) {
          i.ws.forEach((j) => {
            j.cw.forEach((k) => {
              str += k.w
            })
          })
        }
      })

      console.log(str)
    })

    ws.on('close', () => {
      console.log(`本次识别sid：${currentSid}`)
      console.log('connect close!')
      resolve(iatResult.map((i) => (i !== null ? i.ws.map((j) => j.cw.map((k) => k.w).join('')).join('') : '')).join(''))
    })

    ws.on('error', (err) => {
      console.log('websocket connect err: ' + err)
      reject(err)
    })
  })
}
