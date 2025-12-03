# 故障排查指南

## 数据库问题

### 问题：`SqliteError: no such table: projects` 或 `no such table: characters`

**原因**：数据库表未创建，迁移脚本未运行。

**解决方案**：

1. **手动运行迁移**：
   ```bash
   cd apps/server
   npm run migrate
   ```

2. **服务器启动时自动运行**：
   服务器启动时会自动运行迁移，但如果迁移失败，服务器不会启动。

3. **检查数据库文件**：
   确保 `storyweaver.db` 文件存在于项目根目录。

4. **重新创建数据库**（如果数据可以丢失）：
   ```bash
   # 删除现有数据库
   rm storyweaver.db storyweaver.db-shm storyweaver.db-wal
   
   # 重新运行迁移
   cd apps/server
   npm run migrate
   ```

**迁移脚本创建的表**：
- `projects` - 项目表
- `characters` - 角色表
- `jobs` - 任务队列表

## API 连接问题

### 问题：`ERR_CONNECTION_REFUSED` 或 `Failed to fetch`

### 解决方案

#### 1. 检查服务器是否运行

**TypeScript 服务器（推荐）：**
```bash
# 在项目根目录运行
npm run server:ts
# 或
cd apps/server
npm run dev
```

服务器应该运行在 `http://localhost:52301`

**JavaScript 服务器（旧版）：**
```bash
# 在项目根目录运行
npm run server
```

服务器应该运行在 `http://localhost:52300`

#### 2. 检查端口配置

- **前端（React）**: Vite 开发服务器运行在 `52320`，代理到 `52301`
- **后端（TypeScript）**: 运行在 `52301`
- **后端（JavaScript，旧版）**: 运行在 `52300`

#### 3. 检查前端使用的服务器

**如果使用新的 React 前端：**
- 访问 `http://localhost:52320`
- 确保 TypeScript 服务器（52301）正在运行

**如果使用旧的 Legacy 前端：**
- 访问 `http://localhost:52300`（由 JS 服务器托管）
- 或访问 `http://localhost:52301`（由 TS 服务器托管，但需要更新 `public/js/app.js`）

#### 4. 测试 API 连接

在浏览器控制台运行：

```javascript
// 测试健康检查端点
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// 测试 Gemini API（需要先配置 API Key）
fetch('/api/settings/test-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey: 'YOUR_API_KEY' })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

#### 5. 检查 CORS 配置

确保后端服务器的 CORS 配置允许前端来源：

- React 前端：`http://localhost:52320`
- Legacy 前端：`http://localhost:52300` 或 `http://localhost:52301`

#### 6. 检查 Gemini API Key

1. 确保 API Key 有效且未过期
2. 确保 API Key 有访问 Gemini 3 Pro 的权限
3. 在 [Google AI Studio](https://ai.google.dev/gemini-api/docs/gemini-3?hl=zh-cn) 验证 API Key

#### 7. 常见错误

**错误：`API_KEY_INVALID`**
- 检查 API Key 是否正确
- 确保 API Key 未过期
- 检查 API Key 是否有正确的权限

**错误：`PERMISSION_DENIED`**
- API Key 可能没有访问 Gemini 3 Pro 的权限
- 检查 API Key 的配额和限制

**错误：`ERR_CONNECTION_REFUSED`**
- 后端服务器未运行
- 端口配置不匹配
- 防火墙阻止连接

### 快速诊断

运行以下命令检查服务器状态：

```bash
# 检查端口占用
netstat -ano | findstr :52301  # Windows
lsof -i :52301                 # macOS/Linux

# 检查服务器日志
# 查看终端输出，确认服务器已启动
```

### 推荐配置

1. **开发环境**：使用 React 前端 + TypeScript 服务器
   ```bash
   # 终端 1：启动 TS 服务器
   npm run server:ts
   
   # 终端 2：启动 React 前端
   npm run client:react
   ```

2. **生产环境**：构建后使用单一服务器
   ```bash
   npm run build:all
   npm run start:ts
   ```

