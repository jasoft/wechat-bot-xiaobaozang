# 微信机器人 (WeChat Bot)

一个功能丰富的微信机器人项目,支持多个AI平台集成,提供智能对话、定时任务等功能。

## 功能特性

- 🤖 多AI平台支持
  - OpenAI (ChatGPT)
  - Groq
  - Kimi
  - 科大讯飞
  - Coze
  - Dify
  
- 💬 消息处理
  - 智能对话
  - 图片理解
  - 语音识别
  - Markdown 渲染

- ⚡ 系统功能
  - 聊天记录同步
  - 定时任务管理 
  - RESTful API
  - Swagger UI 接口文档

## 安装

1. 克隆项目
```bash
git clone https://github.com/jasoft/wechat-bot-xiaobaozang.git
cd wechat-bot-xiaobaozang
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
```
编辑 `.env` 文件,填入相关配置:

### AI平台配置
- OPENAI_API_KEY: OpenAI/Groq API密钥
- OPENAI_BASE_URL: API基础URL
- OPENAI_MODEL: 使用的模型名称
- QWEN_API_KEY: 通义千问API密钥
- QWEN_BASE_URL: 通义千问API基础URL
- QWEN_MODEL: 通义千问模型名称
- COZE_API_KEY: Coze API密钥
- COZE_BOT_ID: Coze机器人ID
- DIFY_API_KEY: Dify API密钥
- DIFY_BASE_URL: Dify基础URL
- GROQ_API_KEY: Groq API密钥
- GROQ_MODEL: Groq模型名称
- KIMI_API_KEY: Kimi API密钥
- XUNFEI_APP_ID: 讯飞应用ID
- XUNFEI_API_KEY: 讯飞API密钥
- XUNFEI_API_SECRET: 讯飞密钥

### 系统配置
- DATABASE_URL: MySQL数据库连接URL
- PRISMA_LOG_LEVEL: Prisma日志级别
- BOT_NAME: 机器人名称
- BOT_ID: 机器人微信ID
- DEFAULT_AI: 默认AI平台
- WCF_HOST: WeChatFerry主机地址
- WCF_PORT: WeChatFerry端口
- WCF_ROOT: WeChatFerry根目录
- WCF_HTTP_SERVER: WeChatFerry HTTP服务器地址
- MEILI_HOST: MeiliSearch主机地址
- MEILI_API_KEY: MeiliSearch API密钥
- API_PORT: API服务端口
- LOG_LEVEL: 日志级别

### 提示词配置
- SYSTEM_PROMPT: 系统提示词
- IMAGE_UNDERSTANDING_PROMPT: 图片理解提示词
- TOOLCALL_PROMPT: 工具调用提示词

## 使用

开发环境运行:
```bash
npm run dev
```

生产环境运行:
```bash
npm start
```

运行测试:
```bash
npm test
```

## Docker部署

构建镜像:
```bash
docker build -t wechat-bot .
```

运行容器:
```bash
docker run -d --name wechat-bot \
  -v $(pwd)/.env:/app/.env \
  -v $(pwd)/storage:/app/storage \
  wechat-bot
```

## 项目结构

```
src/
├── chatgpt/       # ChatGPT 集成
├── common/        # 公共组件
├── coze/          # Coze AI 集成
├── dify/          # Dify AI 集成
├── groq/          # Groq AI 集成
├── kimi/          # Kimi AI 集成
├── openai/        # OpenAI 集成
├── tools/         # 工具函数
├── wcf/           # 微信核心功能
└── xunfei/        # 讯飞 AI 集成
```

## 技术栈

- Node.js
- Koa (HTTP服务器)
- Prisma (数据库ORM)
- Jest (单元测试)
- Docker (容器化)

## 许可证

ISC

## 作者

soj