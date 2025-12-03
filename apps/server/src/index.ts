// Phase 2：后端 TypeScript 化骨架（Express + Drizzle）
// 当前生产入口仍然是根目录 `server/index.js`。
// 本文件提供未来的 TS 版服务器入口，可通过 `npm run server:ts` 在独立端口调试。

import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import projectRoutes from './routes/project';
import characterRoutes from './routes/character';
import scriptRoutes from './routes/script';
import imageRoutes from './routes/image';
import settingsRoutes from './routes/settings';
import { startWorker } from './queue/worker';
import { runMigrations } from './db/migrations';

// 使用绝对路径，确保编译后也能正确找到模块
// 从 dist/index.js 到项目根目录需要往上 3 层
const projectRoot = path.join(__dirname, '..', '..', '..');
const serverUtilsPath = path.join(projectRoot, 'server', 'utils');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { checkEnvironment } = require(path.join(serverUtilsPath, 'checkEnv'));

dotenv.config();

const app = express();
const PORT = Number(process.env.TS_PORT) || 52301; // 避免与现有 JS 版 52300 冲突

const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === 'true';
const defaultOrigins = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  'http://localhost:52310',
  'http://127.0.0.1:52310',
  'http://localhost:52320',
  'http://127.0.0.1:52320'
];
const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;

app.use(
  cors({
    origin(origin, callback) {
      if (allowAllOrigins || !origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true
  })
);
// 增加 body parser 限制以支持图像上传（base64 编码的图像可能很大）
// 默认限制是 100KB，增加到 20MB 以支持图像数据
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// API 路由：所有路由已 TS 化（必须在静态文件之前）
app.use('/api/script', scriptRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/characters', characterRoutes);

// 静态文件服务
// 生产环境：优先使用构建后的 React 应用
// 开发环境：回退到旧的 public 目录（兼容性）
const isProduction = process.env.NODE_ENV === 'production';
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const publicPath = path.join(__dirname, '..', '..', '..', 'public');
const fs = require('fs');

if (isProduction && fs.existsSync(clientDistPath)) {
  // 生产环境：托管构建后的 React 应用
  app.use(express.static(clientDistPath));
  // SPA 路由回退：所有非 API 请求返回 index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // 开发环境：使用旧的 public 目录（向后兼容）
  app.use(express.static(publicPath));
}

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: 'ts-dev'
  });
});

// 404 处理（仅在 API 路由中）
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

if (require.main === module) {
  if (!checkEnvironment()) {
    // eslint-disable-next-line no-console
    console.log('\n⚠️  警告: 某些功能可能无法正常工作');
    // eslint-disable-next-line no-console
    console.log('   继续启动 TS 服务器...\n');
  }

  // 运行数据库迁移
  runMigrations()
    .then(() => {
      app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`🚀 StoryWeaver TS 服务器运行在 http://localhost:${PORT}`);
        // eslint-disable-next-line no-console
        console.log(`✅ 所有路由已 TS 化，使用 Drizzle ORM`);
        
        // 启动 Job Queue Worker
        startWorker();
        // eslint-disable-next-line no-console
        console.log(`📦 Job Queue Worker 已启动`);
      });
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('❌ 数据库迁移失败:', error);
      process.exit(1);
    });
}

export { app };

