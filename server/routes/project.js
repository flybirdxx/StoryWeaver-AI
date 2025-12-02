const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// 内存存储（实际应用中应使用数据库）
let projects = [
  {
    id: '1',
    name: '赛博朋克：三体前传',
    tags: ['科幻', '悬疑'],
    totalPanels: 120,
    generatedPanels: 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * GET /api/projects
 * 获取所有项目
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: projects
  });
});

/**
 * GET /api/projects/:id
 * 获取项目详情
 */
router.get('/:id', (req, res) => {
  const project = projects.find(p => p.id === req.params.id);
  
  if (!project) {
    return res.status(404).json({
      error: '未找到项目',
      message: `ID ${req.params.id} 的项目不存在`
    });
  }

  res.json({
    success: true,
    data: project
  });
});

/**
 * POST /api/projects
 * 创建新项目
 */
router.post('/', (req, res) => {
  const { name, tags } = req.body;

  if (!name) {
    return res.status(400).json({
      error: '缺少必要参数',
      message: '项目名称不能为空'
    });
  }

  const newProject = {
    id: uuidv4(),
    name,
    tags: tags || [],
    totalPanels: 0,
    generatedPanels: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  projects.push(newProject);

  res.status(201).json({
    success: true,
    data: newProject
  });
});

/**
 * PUT /api/projects/:id
 * 更新项目
 */
router.put('/:id', (req, res) => {
  const projectIndex = projects.findIndex(p => p.id === req.params.id);
  
  if (projectIndex === -1) {
    return res.status(404).json({
      error: '未找到项目',
      message: `ID ${req.params.id} 的项目不存在`
    });
  }

  const { name, tags, totalPanels, generatedPanels } = req.body;
  
  projects[projectIndex] = {
    ...projects[projectIndex],
    ...(name && { name }),
    ...(tags && { tags }),
    ...(totalPanels !== undefined && { totalPanels }),
    ...(generatedPanels !== undefined && { generatedPanels }),
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: projects[projectIndex]
  });
});

module.exports = router;

