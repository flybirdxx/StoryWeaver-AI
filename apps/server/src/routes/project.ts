import express, { Request, Response } from 'express';
import {
  listProjects,
  getProjectById,
  insertProject,
  updateProject,
  type Project,
  type NewProjectInput
} from '../db/projectRepo';

const router = express.Router();

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const mapProjectRow = (row: any): Project | null => {
  if (!row) return null;

  if (row.data) {
    try {
      const parsed = JSON.parse(row.data);
      return {
        ...parsed,
        id: row.id,
        tags: Array.isArray(parsed.tags) ? parsed.tags : parseJson(row.tags, [])
      } as Project;
    } catch {
      // fall through to manual mapping
    }
  }

  const parsedTags = parseJson(row.tags, []);
  const tagsArray = Array.isArray(parsedTags) ? parsedTags : [];
  return {
    id: row.id,
    name: row.name,
    tags: tagsArray,
    totalPanels: row.totalPanels || 0,
    generatedPanels: row.generatedPanels || 0,
    data: row.data,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  } as unknown as Project;
};

// GET /api/projects
router.get('/', async (_req: Request, res: Response) => {
  const rows = await listProjects();
  res.json({
    success: true,
    data: rows.map(mapProjectRow)
  });
});

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response) => {
  const row = await getProjectById(req.params.id);

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

// POST /api/projects
router.post('/', async (req: Request, res: Response) => {
  const { name, tags, totalPanels, generatedPanels } = req.body ?? {};

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
    id: req.body.id || crypto.randomUUID(),
    name: String(name).trim(),
    tags: Array.isArray(tags) ? tags : [],
    totalPanels: Number.isFinite(parsedTotal) ? parsedTotal : 0,
    generatedPanels: Number.isFinite(parsedGenerated) ? parsedGenerated : 0,
    createdAt: now,
    updatedAt: now
  };

  await insertProject(newProject);

  res.status(201).json({
    success: true,
    data: newProject
  });
});

// PUT /api/projects/:id
router.put('/:id', async (req: Request, res: Response) => {
  const existingRow = await getProjectById(req.params.id);

  if (!existingRow) {
    return res.status(404).json({
      error: '未找到项目',
      message: `ID ${req.params.id} 的项目不存在`
    });
  }

  const existing = mapProjectRow(existingRow)!;
  const { name, tags, totalPanels, generatedPanels } = req.body ?? {};

  const parsedTotal = Number(totalPanels);
  const parsedGenerated = Number(generatedPanels);

  const existingTags = Array.isArray(existing.tags) ? existing.tags : [];
  const finalTags = Array.isArray(tags) ? tags : existingTags;
  
  const updatedProject: NewProjectInput = {
    id: existing.id,
    name: name !== undefined ? String(name).trim() : existing.name,
    tags: finalTags,
    totalPanels:
      totalPanels !== undefined && Number.isFinite(parsedTotal)
        ? parsedTotal
        : existing.totalPanels ?? 0,
    generatedPanels:
      generatedPanels !== undefined && Number.isFinite(parsedGenerated)
        ? parsedGenerated
        : existing.generatedPanels ?? 0,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };

  await updateProject(updatedProject);

  res.json({
    success: true,
    data: updatedProject
  });
});

export default router;


