# 部署指南

## 开发环境

### 启动开发服务器

```bash
# 安装依赖
npm install

# 启动开发环境（TS 服务器 + React 前端）
npm run dev

# 或者分别启动
npm run server:ts    # TS 后端服务器 (端口 52301)
npm run client:react # React 前端开发服务器 (端口 52320)
```

### 使用旧版（兼容性）

```bash
# 启动旧版（JS 服务器 + HTML 前端）
npm run dev:legacy
```

## 生产环境构建

### 1. 构建前端

```bash
# 构建 React 前端
npm run build

# 构建产物位于 apps/client/dist/
```

### 2. 构建后端

```bash
# 构建 TypeScript 后端
npm run build:server

# 构建产物位于 apps/server/dist/
```

### 3. 一键构建

```bash
# 同时构建前端和后端
npm run build:all
```

## 生产环境运行

### 方式 1：使用 TypeScript 版本（推荐）

```bash
# 设置环境变量
export NODE_ENV=production

# 启动服务器（会自动托管前端 dist）
npm run start:ts
```

### 方式 2：使用旧版 JavaScript 版本

```bash
npm start
```

## 数据库迁移

### 手动运行迁移

```bash
# 运行数据库迁移脚本（创建 jobs 表等）
npm run migrate --workspace @storyweaver/server
```

### 自动迁移

服务器启动时会自动运行数据库迁移（如果表不存在则创建）。

## 环境变量

创建 `.env` 文件：

```env
# 服务器端口
TS_PORT=52301
PORT=52300

# CORS 配置
ALLOW_ALL_ORIGINS=false
ALLOWED_ORIGINS=http://localhost:52320,http://localhost:52310

# API Keys（可选，也可通过前端设置）
GEMINI_API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# 图像生成配置
IMAGE_CONCURRENCY=3
GENERATION_RETRY_LIMIT=3
```

## 目录结构

```
storyweaver-ai/
├── apps/
│   ├── client/          # React 前端
│   │   ├── src/         # 源代码
│   │   └── dist/        # 构建产物（生产环境）
│   └── server/          # TypeScript 后端
│       ├── src/         # 源代码
│       └── dist/        # 构建产物（生产环境）
├── packages/
│   └── shared/          # 共享类型定义
├── public/              # 旧版前端（开发环境兼容）
└── server/              # 旧版后端（兼容性保留）
```

## 注意事项

1. **生产环境**：确保 `apps/client/dist` 目录存在（通过 `npm run build` 生成）
2. **数据库**：SQLite 数据库文件位于项目根目录，确保有写入权限
3. **静态资源**：生产环境会自动托管 `apps/client/dist`，开发环境使用 `public/` 目录
4. **API 路由**：所有 API 请求以 `/api` 开头，会被正确路由到后端

## 故障排查

### 前端无法访问

- 检查 `apps/client/dist` 是否存在
- 检查 `NODE_ENV` 环境变量是否正确设置
- 查看服务器日志确认静态文件路径

### 数据库错误

- 运行 `npm run migrate` 手动创建表
- 检查数据库文件权限
- 查看服务器启动日志中的迁移信息

### API 请求失败

- 检查 CORS 配置
- 确认 API Key 已正确配置
- 查看服务器日志中的错误信息

