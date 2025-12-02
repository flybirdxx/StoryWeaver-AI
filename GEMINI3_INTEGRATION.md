# Gemini 3 Pro 集成指南

本文档说明如何在 StoryWeaver AI 中使用 Gemini 3 Pro 的图像生成功能。

## 模型信息

根据 [Gemini 3 官方文档](https://ai.google.dev/gemini-api/docs/gemini-3?hl=zh-cn)：

- **gemini-3-pro-preview**: 用于高级推理和文本生成
- **gemini-3-pro-image-preview**: 用于图像生成（Nano Banana Pro 预览版）

### 图像生成模型规格

| 模型 ID | 上下文窗口 | 知识截点 | 定价 |
|---------|-----------|---------|------|
| gemini-3-pro-image-preview | 65k / 32k | 2025年1月 | $2（文本输入）/ $0.134（图片输出） |

## 安装依赖

确保已安装最新的 Google Gen AI SDK：

```bash
npm install @google/genai@latest
```

## 配置

在 `.env` 文件中设置你的 API Key：

```
GEMINI_API_KEY=your_gemini_api_key_here
```

## 使用方法

### 1. 单张图像生成

```javascript
// 前端调用
const response = await fetch('http://localhost:3000/api/image/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: '一个赛博朋克风格的侦探站在雨中',
    style: 'cel-shading',
    aspectRatio: '16:9',
    imageSize: '4K'
  })
});
```

### 2. 批量图像生成

```javascript
const response = await fetch('http://localhost:3000/api/image/generate-batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    panels: [
      { id: 1, prompt: '第一个分镜的描述' },
      { id: 2, prompt: '第二个分镜的描述' }
    ],
    style: 'cel-shading',
    options: {
      aspectRatio: '16:9',
      imageSize: '4K'
    }
  })
});
```

## 支持的参数

### 艺术风格 (style)
- `cel-shading`: 日系赛璐珞风格
- `noir`: 美漫黑白线稿
- `ghibli`: 吉卜力水彩风格
- `realism`: 电影实拍感

### 宽高比 (aspectRatio)
- `16:9`: 宽屏（默认）
- `1:1`: 正方形
- `9:16`: 竖屏
- `4:3`: 传统比例
- `3:4`: 竖屏传统比例

### 图像尺寸 (imageSize)
- `1K`: 1024px
- `2K`: 2048px
- `4K`: 4096px（默认）

## API 响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    "imageUrl": "data:image/png;base64,...",
    "mimeType": "image/png",
    "prompt": "增强后的提示词",
    "style": "cel-shading"
  }
}
```

### 批量生成响应

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "panelId": 1,
        "imageUrl": "data:image/png;base64,...",
        "mimeType": "image/png"
      }
    ],
    "errors": [],
    "total": 2,
    "success": 2,
    "failed": 0
  }
}
```

## 故障排除

### 1. 模块未找到错误

如果遇到 `Cannot find module '@google/genai'` 错误：

```bash
npm install @google/genai@latest
```

### 2. API Key 错误

确保 `.env` 文件中的 `GEMINI_API_KEY` 已正确设置，并且有访问 Gemini 3 Pro Image Preview 的权限。

### 3. 图像生成失败

- 检查 API Key 是否有效
- 确认网络连接正常
- 查看服务器日志获取详细错误信息
- 验证提示词是否符合 API 要求

### 4. 限流问题

批量生成时，系统会自动添加 1 秒延迟以避免 API 限流。如果仍然遇到限流，可以：

- 减少批量大小
- 增加延迟时间（修改 `server/routes/image.js` 中的延迟）

## 参考文档

- [Gemini 3 开发者指南](https://ai.google.dev/gemini-api/docs/gemini-3?hl=zh-cn)
- [图像生成文档](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn)
- [Google AI Studio](https://aistudio.google.com/)

## 注意事项

1. **定价**: 图像生成按 token 和分辨率计费，请查看[定价页面](https://ai.google.dev/pricing)了解详情
2. **预览版**: `gemini-3-pro-image-preview` 是预览版，API 可能会变化
3. **速率限制**: 注意 API 的速率限制，避免频繁请求
4. **图像大小**: 4K 图像会消耗更多 token，根据需要选择合适的分辨率

