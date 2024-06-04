"use strict";

import {
  getImageRecognitionText,
  getVoiceRecognitionText,
} from "./wxmessage.js";
import logger from "./logger.js";
import { colorize } from "json-colorizer";
import OpenAI from "openai";

export class OpenAIBot {
  constructor(env = process.env) {
    this.env = env;
    this.openai = new OpenAI({
      apiKey: this.env.OPENAI_API_KEY,
      baseURL: this.env.OPENAI_BASE_URL,
    });
    // This is the default and can be omitted}env.OPENAI_API_KEY)
  }

  async _parseMessage(payloadText, parseMedia = true) {
    const lastUserMessage = payloadText.at(-1);
    let result = {
      orignalMessage: lastUserMessage.content,
      convertedMessage: lastUserMessage.content,
      response: null,
      payload: payloadText,
    };
    // 如果需要解析媒体消息, 例如微信消息
    if (parseMedia) {
      // If the last parsedMessage is an image parsedMessage, call the image understanding API
      if (lastUserMessage.content.includes("[图片消息]")) {
        // 如果是图片直接返回识别结果,不参与对话
        const response = await getImageRecognitionText(lastUserMessage);
        result.convertedMessage = response;
        result.response = response;
      }

      // 如果最后一条消息是语音消息，调用语音理解接口
      else if (lastUserMessage.content.includes("[语音消息]")) {
        // 替换最后一条消息为语音识别结果
        const response = await getVoiceRecognitionText(lastUserMessage);
        const payload = [...payloadText];
        payload.pop();
        payload.push({ role: "user", content: response });
        result.convertedMessage = response;
        result.payload = payload;
      }
    }
    // 如果错误,返回错误信息
    else if (lastUserMessage.content.includes("[错误]")) {
      result.response = "对不起，我无法理解你的意思，试试用文字吧";
    }

    // 如果是其他情况，则直接返回
    return result;
  }

  async getResponse(parsedMessage) {
    const { orignalMessage, convertedMessage, payload } = parsedMessage;
    try {
      // let finalResponse = await toolCall.getResponse(this.env.TOPIC_ID, [
      //   {
      //     role: "system",
      //     content: this.env.SYSTEM_PROMPT,
      //   },
      //   payload,
      // ]);
      let finalResponse = false;
      // 如果没有返回toolcall结果,则调用openai进行正常对话
      if (!finalResponse) {
        const chatCompletion = await this.openai.chat.completions.create({
          messages: payload,
          model: this.env.OPENAI_MODEL,
          temperature: 1,
          max_tokens: 1024,
          stream: false,
          stop: null,
        });
        finalResponse =
          chatCompletion.choices[0]?.message?.content ||
          "对不起，我无法理解你的意思，请再试一次";
      }
      // Print the completion returned by the LLM.
      const result = {
        orignalMessage: orignalMessage,
        convertedMessage: convertedMessage,
        response: finalResponse,
      };
      logger.info("AIReplyHandler: getResponse", colorize(result));
      return result;
    } catch (error) {
      logger.error("Error in getResponse", error);
      return {
        orignalMessage: orignalMessage,
        convertedMessage: convertedMessage,
        response: "哎呀,我好像出了点问题,让我修复下,待会儿再和我聊天吧",
      };
    }
  }

  async getAIReply(payload) {
    const payloadText = [
      {
        role: "system",
        content: this.env.SYSTEM_PROMPT,
      },
    ];
    payloadText.push(...payload);
    logger.info("AIReplyHandler: Payload", colorize(payloadText));
    return this.getRawReply(payloadText);
  }

  async getRawReply(payload) {
    const parsedMessage = await this._parseMessage(payload);

    // 有返回了response,不需要提交给 ai 处理, 则直接返回
    if (parsedMessage.response) {
      return parsedMessage;
    }

    // 需要 ai 处理消息
    return this.getResponse(parsedMessage);
  }
}
