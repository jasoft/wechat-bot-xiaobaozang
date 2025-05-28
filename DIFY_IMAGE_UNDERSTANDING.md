# Dify 图片理解功能集成总结

## 功能概述

已成功将 `imageUnderstanding` 函数从讯飞 WebSocket API 迁移到 Dify workflow API。新的实现支持：

1. **文件上传**: 将本地图片文件上传到 Dify 平台
2. **图片理解**: 通过 Dify workflow 分析图片内容
3. **错误处理**: 完整的错误处理和日志记录

## API 配置

- **API Key**: `app-Z5gaMIwM32TKbu0tOZTXhR45`
- **Base URL**: 默认使用 `https://api.dify.ai` (可通过环境变量 `DIFY_BASE_URL` 配置)
- **应用类型**: Workflow 应用

## 核心功能

### 1. 文件上传 (`uploadFileToDify`)
- 端点: `POST /v1/files/upload`
- 支持格式: JPG, PNG, GIF, WEBP
- 返回文件ID用于后续处理

### 2. 工作流执行 (`runDifyWorkflow`)
- 端点: `POST /v1/workflows/run`
- 输入参数: 图片文件ID + 用户问题
- 输出: AI 分析结果

## 使用方法

```javascript
import { imageUnderstanding } from './src/xunfei/imageunderstanding.js'

// 基本使用
const result = await imageUnderstanding('/path/to/image.jpg', '请描述这张图片的内容')
console.log(result)

// 不指定问题（使用默认问题）
const result = await imageUnderstanding('/path/to/image.jpg')
```

## 测试结果

### 成功部分
✅ 文件上传功能正常工作
✅ 获取到文件ID (例: `d7e6b4a1-b509-481f-a9b5-8fd4b4cadbe0`)
✅ API 连接和认证正常

### 需要解决的问题
❌ Workflow 配置问题: "Detected file type does not match the specified type"

## 可能的解决方案

### 1. 检查 Dify Workflow 配置
确保你的 Dify workflow 中：
- 图片输入节点配置正确
- 支持的文件类型包含你要测试的格式
- 输入参数名称与代码匹配（建议使用 "image" 和 "question"）

### 2. 测试不同格式的图片
```bash
# 推荐测试格式
- .jpg / .jpeg
- .png (非 favicon 类型)
- .webp
```

### 3. 检查 Workflow 输入节点命名
常见的输入节点名称：
- `image` (推荐)
- `input_image`
- `file`
- `picture`

## 代码特性

### 错误处理
- 文件不存在检查
- API 错误详细记录
- 多种输入格式自动尝试

### 调试支持
- 详细的日志输出
- 请求/响应数据记录
- 文件ID跟踪

### 灵活性
- 支持多种输入参数格式
- 自动尝试不同的字段名
- 可配置的基础URL

## 下一步建议

1. **验证 Workflow 配置**: 在 Dify 控制台检查你的 workflow 设置
2. **测试标准图片**: 使用常见的 JPG/PNG 图片进行测试
3. **调整输入参数**: 根据你的 workflow 配置调整输入字段名
4. **监控日志**: 使用调试日志了解具体的错误原因

## 技术栈

- **HTTP 客户端**: axios
- **文件上传**: form-data
- **图片处理**: sharp (保留，用于未来的图片预处理)
- **日志**: 项目自定义 logger

## 文件结构

```
src/xunfei/imageunderstanding.js  # 主要实现文件
test_image_understanding.js       # 测试文件
```

## 联系与支持

如果遇到问题，请检查：
1. Dify workflow 配置是否正确
2. API key 是否有效
3. 网络连接是否正常
4. 图片文件格式是否支持
