import { PrismaClient } from "@prisma/client";
import logger from "../common/logger.js";
import { colorize } from "json-colorizer";
import { MeiliSearch } from "meilisearch";

export const CHAT_LOG_INDEX = "chatlog";

export class ChatTopic {
  constructor(topicId) {
    this.topicId = topicId;
    this.prisma = new PrismaClient();
    this.meilisearch = new MeiliSearch({
      host: process.env.MEILI_HOST,
      apiKey: process.env.MEILI_API_KEY,
    });
  }

  async getSystemPrompt() {
    const defaultSysPrompt =
      process.env.SYSTEM_PROMPT ||
      "你好, 我是一个智能助手, 有什么可以帮助你的吗？";
    try {
      const sysPrompt = await this.prisma.character.findFirst({
        where: {
          topicId: this.topicId,
        },
      });

      // 使用可选链操作符安全地访问 sysPrompt.description
      return sysPrompt?.description || defaultSysPrompt;
    } catch (error) {
      // 错误处理逻辑，可以记录错误日志或返回默认值
      logger.error("获取系统提示信息时发生错误:", error);
      return defaultSysPrompt;
    }
  }

  /**
   *
   * 从搜索引擎中搜索聊天记录, filter 指定的 topicid
   *
   * @param query 搜索的关键词
   * @returns 搜索结果
   *
   */
  async search(query) {
    const searchResult = meilisearch.index(CHAT_LOG_INDEX).search(query);
    logger.debug("search result", colorize(searchResult));
    return searchResult;
  }
}
