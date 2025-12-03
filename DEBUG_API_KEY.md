# API Key 测试调试指南

## 问题现象
- `/api/health` 测试成功 ✅
- `/api/settings/test-key` 返回 400 错误 ❌

## 调试步骤

### 1. 检查服务器日志
重启服务器后，点击"测试"按钮，查看服务器终端输出：
- 应该看到 `[Settings] 收到测试 API Key 请求`
- 应该看到 `[Settings] 请求体: {...}`
- 应该看到 `[Settings] Content-Type: ...`

### 2. 检查浏览器网络请求
1. 打开浏览器开发者工具 (F12)
2. 切换到 "Network" (网络) 标签
3. 点击"测试"按钮
4. 找到 `/api/settings/test-key` 请求
5. 查看：
   - **Request Headers**: 确认 `Content-Type: application/json`
   - **Request Payload**: 确认包含 `{"apiKey":"..."}`
   - **Response**: 查看服务器返回的具体错误信息

### 3. 手动测试 API Key
在浏览器控制台运行：

```javascript
// 测试 API Key（替换 YOUR_API_KEY）
fetch('/api/settings/test-key', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    apiKey: 'YOUR_API_KEY'
  })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### 4. 常见问题

#### 问题 1: 请求体为空
**症状**: 服务器日志显示 `请求体: {}`
**原因**: `express.json()` 中间件未正确解析请求
**解决**: 检查服务器启动日志，确认中间件已加载

#### 问题 2: API Key 格式错误
**症状**: 服务器返回 "缺少 API Key"
**原因**: 请求体格式不正确
**解决**: 检查前端发送的 JSON 格式

#### 问题 3: Gemini API 连接失败
**症状**: 服务器日志显示网络错误
**原因**: 无法连接到 Google API
**解决**: 检查网络连接和防火墙设置

### 5. 验证 Gemini API Key
直接在浏览器测试 Gemini API：

```javascript
// 替换 YOUR_API_KEY
const apiKey = 'YOUR_API_KEY';
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'test' }] }]
  })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

如果这个请求也失败，说明 API Key 本身有问题。

