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
// 默认限制是 100KB，增加到 50MB 以支持大尺寸图像数据（三视图等）
// 注意：如果图像数据过大，建议使用 URL 而不是 base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API 路由：所有路由已 TS 化（必须在静态文件之前）
app.use('/api/script', scriptRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/characters', characterRoutes);

// 静态文件服务
// 生产环境：使用构建后的 React 应用
// 开发环境：代理到 Vite 开发服务器（新 React UI）
const isProduction = process.env.NODE_ENV === 'production';
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');

if (isProduction && fs.existsSync(clientDistPath)) {
  // 生产环境：托管构建后的 React 应用
  app.use(express.static(clientDistPath));
  // SPA 路由回退：所有非 API 请求返回 index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
  // eslint-disable-next-line no-console
  console.log('✅ 生产环境：使用构建后的 React 应用');
} else {
  // 开发环境：代理到 Vite 开发服务器（新 React UI）
  let httpProxy: any = null;
  try {
    httpProxy = require('http-proxy-middleware');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('❌ http-proxy-middleware 未安装！');
    // eslint-disable-next-line no-console
    console.error('   请运行: npm install http-proxy-middleware --workspace @storyweaver/server');
    // eslint-disable-next-line no-console
    console.error('   或者直接访问 Vite 开发服务器: http://localhost:52320');
    process.exit(1);
  }

  const VITE_PORT = 52320;
  const proxyMiddleware = httpProxy.createProxyMiddleware({
    target: `http://localhost:${VITE_PORT}`,
    changeOrigin: true,
    ws: true, // 支持 WebSocket（HMR 需要）
    logLevel: 'warn', // 显示警告以便调试
    onError: (err: any, req: express.Request, res: express.Response) => {
      // eslint-disable-next-line no-console
      console.error(`❌ 代理到 Vite 服务器失败:`, err.message);
      // eslint-disable-next-line no-console
      console.warn(`   请确保 Vite 开发服务器正在运行: npm run client:react`);
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Vite 开发服务器不可用',
          message: `无法连接到 http://localhost:${VITE_PORT}`,
          suggestion: '请确保运行了 npm run dev 或 npm run client:react'
        });
      }
    }
  });
  
  app.use(
    '*',
    (req, res, next) => {
      // 跳过 API 路由（已经在前面处理了）
      if (req.path.startsWith('/api')) {
        return next();
      }
      // 代理到 Vite
      return proxyMiddleware(req, res, next);
    }
  );
  // eslint-disable-next-line no-console
  console.log(`📡 开发环境：非 API 请求将代理到 Vite (http://localhost:${VITE_PORT})`);
  // eslint-disable-next-line no-console
  console.log(`   提示：如果 Vite 服务器未运行，请先启动: npm run client:react`);
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

  // 添加未捕获错误处理，防止服务器崩溃
  process.on('uncaughtException', (error) => {
    // eslint-disable-next-line no-console
    console.error('❌ 未捕获的异常:', error);
    // 不要立即退出，让服务器继续运行（开发环境）
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    // eslint-disable-next-line no-console
    console.error('❌ 未处理的 Promise 拒绝:', reason);
    // 开发环境不退出，生产环境退出
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  // 运行数据库迁移
  runMigrations()
    .then(() => {
      const server = app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`🚀 StoryWeaver TS 服务器运行在 http://localhost:${PORT}`);
        // eslint-disable-next-line no-console
        console.log(`✅ 所有路由已 TS 化，使用 Drizzle ORM`);
        
        // 启动 Job Queue Worker（不阻塞服务器启动）
        try {
          startWorker();
          // eslint-disable-next-line no-console
          console.log(`📦 Job Queue Worker 已启动`);
        } catch (workerError) {
          // eslint-disable-next-line no-console
          console.error('⚠️  Worker 启动失败（服务器继续运行）:', workerError);
        }
      });

      // 添加服务器错误处理
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          // eslint-disable-next-line no-console
          console.error(`❌ 端口 ${PORT} 已被占用，请检查是否有其他进程在使用该端口`);
        } else {
          // eslint-disable-next-line no-console
          console.error('❌ 服务器错误:', error);
        }
        process.exit(1);
      });
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('❌ 数据库迁移失败:', error);
      process.exit(1);
    });
}

export { app };

