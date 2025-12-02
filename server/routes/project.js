const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

const mapProjectRow = (row) => {
  if (!row) return null;
  if (row.data) {
    try {
      const parsed = JSON.parse(row.data);
      return {
        ...parsed,
        id: row.id,
        tags: Array.isArray(parsed.tags) ? parsed.tags : parseJson(row.tags, [])
      };
    } catch (_) {
      // fall through to manual mapping
    }
  }

  return {
    id: row.id,
    name: row.name,
    tags: parseJson(row.tags, []),
    totalPanels: row.total_panels || 0,
    generatedPanels: row.generated_panels || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const insertProject = (project) => {
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, tags, total_panels, generated_panels, data, created_at, updated_at)
    VALUES (@id, @name, @tags, @totalPanels, @generatedPanels, @data, @createdAt, @updatedAt)
  `);

  stmt.run({
    ...project,
    tags: JSON.stringify(project.tags || []),
    data: JSON.stringify(project)
  });
};

const updateProjectRow = (project) => {
  const stmt = db.prepare(`
    UPDATE projects
    SET name = @name,
        tags = @tags,
        total_panels = @totalPanels,
        generated_panels = @generatedPanels,
        data = @data,
        updated_at = @updatedAt
    WHERE id = @id
  `);

  stmt.run({
    ...project,
    tags: JSON.stringify(project.tags || []),
    data: JSON.stringify(project)
  });
};

/**
 * GET /api/projects
 * 获取所有项目
 */
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY datetime(updated_at) DESC').all();
  res.json({
    success: true,
    data: rows.map(mapProjectRow)
  });
});

/**
 * GET /api/projects/:id
 * 获取项目详情
 */
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  if (!row) {
    return res.status(404).json({
      error: '未找到项目',
      message: `ID ${req.params.id} 的项目不存在`
    });
  }

  res.json({
    success: true,
    data: mapProjectRow(row)
  });
});

/**
 * POST /api/projects
 * 创建新项目
 */
router.post('/', (req, res) => {
  const { name, tags, totalPanels, generatedPanels } = req.body;

  if (!name) {
    return res.status(400).json({
      error: '缺少必要参数',
      message: '项目名称不能为空'
    });
  }

  const now = new Date().toISOString();
  const parsedTotal = Number(totalPanels);
  const parsedGenerated = Number(generatedPanels);
  const newProject = {
    id: uuidv4(),
    name: name.trim(),
    tags: Array.isArray(tags) ? tags : [],
    totalPanels: Number.isFinite(parsedTotal) ? parsedTotal : 0,
    generatedPanels: Number.isFinite(parsedGenerated) ? parsedGenerated : 0,
    createdAt: now,
    updatedAt: now
  };

  insertProject(newProject);

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
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  if (!row) {
    return res.status(404).json({
      error: '未找到项目',
      message: `ID ${req.params.id} 的项目不存在`
    });
  }

  const existing = mapProjectRow(row);
  const { name, tags, totalPanels, generatedPanels } = req.body;

  const parsedTotal = Number(totalPanels);
  const parsedGenerated = Number(generatedPanels);
  const updatedProject = {
    ...existing,
    ...(name !== undefined && { name: name.trim() }),
    ...(Array.isArray(tags) && { tags }),
    ...(totalPanels !== undefined && {
      totalPanels: Number.isFinite(parsedTotal) ? parsedTotal : existing.totalPanels
    }),
    ...(generatedPanels !== undefined && {
      generatedPanels: Number.isFinite(parsedGenerated) ? parsedGenerated : existing.generatedPanels
    }),
    updatedAt: new Date().toISOString()
  };

  updateProjectRow(updatedProject);

  res.json({
    success: true,
    data: updatedProject
  });
});

module.exports = router;

