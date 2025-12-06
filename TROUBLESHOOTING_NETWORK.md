# 网络连接问题排查指南

## 问题 1: 前端无法连接 (`ERR_CONNECTION_REFUSED`)

### 症状
- 浏览器控制台显示：`net::ERR_CONNECTION_REFUSED` 到 `http://localhost:52320`
- 前端页面无法加载或 API 请求失败

### 解决方案

1. **启动前端开发服务器**
   ```bash
   # 在项目根目录执行
   npm run dev
   ```
   或者单独启动前端：
   ```bash
   npm run client:react
   ```

2. **确认端口**
   - 前端开发服务器应该在 `http://localhost:52320`
   - 后端服务器应该在 `http://localhost:52301`
   - 如果端口被占用，检查是否有其他进程在使用这些端口

3. **检查服务状态**
   ```bash
   # Windows PowerShell
   netstat -ano | findstr "52320"
   netstat -ano | findstr "52301"
   ```

## 问题 2: Gemini API 连接失败 (`fetch failed`)

### 症状
- 后端日志显示：`剧本分析失败: fetch failed`
- API Key 测试失败

### 可能的原因

1. **网络连接问题**
   - 服务器无法访问 `generativelanguage.googleapis.com`
   - 防火墙或代理设置阻止了连接

2. **API Key 无效**
   - API Key 未正确设置
   - API Key 已过期或被撤销

3. **超时问题**
   - 网络延迟过高，超过 60 秒超时限制

### 解决方案

#### 步骤 1: 检查 API Key

1. 在设置页面输入有效的 Gemini API Key
2. 点击"测试"按钮验证连通性
3. 如果测试失败，检查：
   - API Key 是否正确（以 `AIzaSy` 开头）
   - API Key 是否在 Google AI Studio 中有效
   - API Key 是否有访问 Gemini 3 Pro 的权限

#### 步骤 2: 检查网络连接

1. **从服务器测试网络连接**
   ```bash
   # 测试是否能访问 Google API
   curl -I https://generativelanguage.googleapis.com
   ```

2. **检查防火墙设置**
   - 确保防火墙允许出站连接到 `*.googleapis.com`
   - 如果使用代理，确保代理配置正确

3. **检查环境变量**
   ```bash
   # 确认 API Key 已设置
   echo $GEMINI_API_KEY  # Linux/Mac
   echo %GEMINI_API_KEY% # Windows CMD
   $env:GEMINI_API_KEY   # Windows PowerShell
   ```

#### 步骤 3: 使用改进的错误处理

已更新的代码现在会提供更详细的错误信息：
- **网络连接失败**：会明确提示检查网络或防火墙
- **请求超时**：会提示连接超过 60 秒
- **API 错误**：会显示具体的错误消息

### 测试步骤

1. **重启开发服务器**
   ```bash
   # 停止所有服务（Ctrl+C）
   # 然后重新启动
   npm run dev
   ```

2. **测试 API Key**
   - 打开设置页面
   - 输入 API Key
   - 点击"测试"按钮
   - 查看错误消息（现在会更详细）

3. **测试剧本分析**
   - 如果 API Key 测试成功
   - 尝试分析一个剧本
   - 查看后端日志中的详细错误信息

## 常见错误消息

| 错误消息 | 原因 | 解决方案 |
|---------|------|---------|
| `ERR_CONNECTION_REFUSED` | 前端服务器未运行 | 运行 `npm run dev` |
| `fetch failed` | 网络连接问题 | 检查网络、防火墙、代理设置 |
| `请求超时` | 网络延迟过高 | 检查网络连接，或增加超时时间 |
| `API Key 验证失败` | API Key 无效 | 检查 API Key 是否正确 |

## 调试技巧

1. **查看详细日志**
   - 后端日志会显示详细的错误信息
   - 前端控制台会显示网络错误

2. **使用诊断工具**
   - 在设置页面可能有诊断功能
   - 检查各个服务的连接状态

3. **逐步测试**
   - 先测试 API Key 连通性
   - 再测试剧本分析功能
   - 最后测试图像生成功能

## 如果问题仍然存在

1. 检查 `server/services/geminiService.js` 中的错误处理
2. 查看后端日志的完整错误堆栈
3. 确认网络环境可以访问 Google API
4. 尝试使用 VPN 或更换网络环境

