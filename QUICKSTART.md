# 快速开始指南

## 前置要求

- Node.js 16+ 
- npm 或 yarn
- Gemini API Key（从 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取）

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（基于 `.env.example`）：

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

编辑 `.env` 文件，填入你的 Gemini API Key：

```
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=52300
NODE_ENV=development
```

### 3. 启动应用

#### 方式一：同时启动前后端（推荐）

```bash
npm run dev
```

这将启动：
- 后端 API 服务器：http://localhost:52300
- 前端静态服务器：http://localhost:52310

#### 方式二：分别启动

```bash
# 终端 1：启动后端
npm run server

# 终端 2：启动前端（需要先安装 http-server）
npm install -g http-server
npm run client
```

### 4. 访问应用

打开浏览器访问：http://localhost:52310

## 使用流程

1. **配置 API Key**
   - 进入"系统设置"
   - 输入你的 Gemini API Key
   - 点击保存

2. **创建角色**（可选）
   - 进入"角色库"
   - 点击"新建角色"
   - 填写角色信息，确保 AI 生成的一致性

3. **分析剧本**
   - 进入"剧本中心"
   - 输入你的剧本文本
   - 点击"AI 导演分析"
   - 等待分析完成

4. **查看分镜**
   - 进入"故事板"
   - 切换"电影模式"或"宫格漫画模式"
   - 查看生成的分镜数据

5. **生成图像**（待实现）
   - 在故事板中选择艺术风格
   - 点击"生成分镜图像"
   - 等待图像生成完成

## 功能说明

### 已实现功能

✅ 剧本分析和分镜生成
✅ 角色库管理
✅ 故事板可视化（电影模式/漫画模式）
✅ 创作概览和统计
✅ API 集成框架

### 待实现功能

⏳ 图像生成（需要 Gemini 3 Pro API）
⏳ 项目持久化存储（数据库）
⏳ 文件导入/导出
⏳ 用户认证

## 故障排除

### API 请求失败

- 检查 `.env` 文件中的 API Key 是否正确
- 确认后端服务器正在运行（http://localhost:52300）
- 检查浏览器控制台的错误信息

### 端口被占用

修改 `.env` 文件中的 `PORT` 值，或修改 `package.json` 中的端口配置。

### 依赖安装失败

尝试清除缓存后重新安装：

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 开发说明

### 项目结构

```
storyweaver-ai/
├── public/              # 前端文件
│   ├── index.html      # 主页面
│   ├── css/            # 样式
│   └── js/             # JavaScript 模块
├── server/             # 后端服务
│   ├── index.js        # 服务器入口
│   ├── routes/         # API 路由
│   └── services/       # 业务逻辑
└── package.json        # 项目配置
```

### API 端点

- `POST /api/script/analyze` - 分析剧本
- `GET /api/characters` - 获取角色列表
- `POST /api/characters` - 创建角色
- `GET /api/projects` - 获取项目列表
- `GET /api/health` - 健康检查

## 下一步

- 集成 Gemini 3 Pro 图像生成 API
- 添加数据库持久化（推荐 MongoDB 或 PostgreSQL）
- 实现用户认证和项目管理
- 优化 UI/UX 体验

