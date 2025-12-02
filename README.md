# StoryWeaver AI - 智能分镜与漫画生成平台

一个基于 AI 的智能分镜与漫画生成平台，使用 Gemini API 进行剧本分析和图像生成。

## 功能特性

- 📝 **剧本中心**: 输入剧本，AI 自动分析并生成结构化分镜数据
- 🎬 **故事板画布**: 支持电影模式和宫格漫画模式两种可视化方式
- 👥 **角色库**: 管理角色特征，确保 AI 生成的一致性
- 📊 **创作概览**: 实时监控项目进度和 API 使用情况
- 🎨 **多种风格**: 支持日系赛璐珞、美漫黑白、吉卜力水彩等多种艺术风格

## 技术栈

- **前端**: HTML5, Tailwind CSS, Chart.js, Vanilla JavaScript
- **后端**: Node.js, Express
- **AI**: 
  - Google Gemini 3 Pro (逻辑分析和剧本解析) - [文档](https://ai.google.dev/gemini-api/docs/gemini-3?hl=zh-cn)
  - Gemini 3 Pro Image Preview (图像生成) - [文档](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的 Gemini API Key:

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key:
```
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. 启动开发服务器

```bash
npm run dev
```

这将同时启动：
- 后端 API 服务 (端口 3000)
- 前端静态服务器 (端口 8080)

访问 http://localhost:8080 查看应用。

### 4. 单独启动

```bash
# 仅启动后端
npm run server

# 仅启动前端（需要先安装 http-server）
npm run client
```

## 项目结构

```
storyweaver-ai/
├── public/              # 前端静态文件
│   ├── index.html      # 主页面
│   ├── css/            # 样式文件
│   └── js/             # JavaScript 文件
├── server/             # 后端服务
│   ├── index.js        # Express 服务器入口
│   ├── routes/         # API 路由
│   ├── services/       # 业务逻辑服务
│   └── utils/          # 工具函数
├── uploads/            # 上传文件存储
├── package.json
├── .env.example
└── README.md
```

## API 端点

### 剧本分析
- `POST /api/analyze-script` - 分析剧本并生成分镜数据

### 图像生成
- `POST /api/image/generate` - 生成单张分镜图像
- `POST /api/image/generate-batch` - 批量生成分镜图像（最多10张）

### 角色管理
- `GET /api/characters` - 获取所有角色
- `POST /api/characters` - 创建新角色
- `PUT /api/characters/:id` - 更新角色
- `DELETE /api/characters/:id` - 删除角色

### 项目管理
- `GET /api/projects` - 获取所有项目
- `POST /api/projects` - 创建新项目
- `GET /api/projects/:id` - 获取项目详情

## 开发说明

### 前端架构

前端采用单页应用 (SPA) 架构，使用原生 JavaScript 实现路由和状态管理。主要模块：

- `app.js` - 应用主入口，路由管理
- `scriptStudio.js` - 剧本中心功能
- `storyboard.js` - 故事板画布功能
- `characters.js` - 角色库管理
- `dashboard.js` - 概览面板

### 后端架构

后端采用 Express.js 框架，模块化设计：

- `routes/` - API 路由定义
- `services/geminiService.js` - Gemini API 封装
- `services/analysisService.js` - 剧本分析服务
- `services/imageService.js` - 图像生成服务

## 许可证

MIT

