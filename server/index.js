const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { checkEnvironment } = require('./utils/checkEnv');

const scriptRoutes = require('./routes/script');
const imageRoutes = require('./routes/image');
const characterRoutes = require('./routes/character');
const projectRoutes = require('./routes/project');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// API 路由
app.use('/api/script', scriptRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/settings', settingsRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 启动前检查环境
if (!checkEnvironment()) {
  console.log('\n⚠️  警告: 某些功能可能无法正常工作');
  console.log('   继续启动服务器...\n');
}

app.listen(PORT, () => {
  console.log(`🚀 StoryWeaver AI 服务器运行在 http://localhost:${PORT}`);
  console.log(`📝 API 文档: http://localhost:${PORT}/api/health`);
  console.log(`🌐 前端地址: http://localhost:8188 (如果使用 npm run dev)`);
});

