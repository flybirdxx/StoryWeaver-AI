import express, { Request, Response } from 'express';
import {
  listCharacters,
  getCharacterById,
  insertCharacter,
  updateCharacter,
  deleteCharacter
} from '../db/characterRepo';

const router = express.Router();

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const mapCharacterRow = (row: any) => {
  if (!row) return null;

  if (row.data) {
    try {
      const parsed = JSON.parse(row.data);
      return {
        ...parsed,
        id: row.id,
        tags: Array.isArray(parsed.tags) ? parsed.tags : parseJson(row.tags, []),
        // 修复：优先使用数据库字段中的 imageUrl（更可靠），如果数据库中没有则使用 data 中的
        imageUrl: row.imageUrl !== null && row.imageUrl !== undefined ? row.imageUrl : (parsed.imageUrl || null),
        imageIsUrl: Boolean(parsed.imageIsUrl ?? row.imageIsUrl)
      };
    } catch {
      // fall through
    }
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    tags: parseJson(row.tags, []),
    basePrompt: row.basePrompt || '',
    // 修复：正确处理 imageUrl，空字符串应该保留（可能是有效的 base64）
    imageUrl: row.imageUrl !== null && row.imageUrl !== undefined ? row.imageUrl : null,
    imageIsUrl: Boolean(row.imageIsUrl),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

// GET /api/characters
router.get('/', async (_req: Request, res: Response) => {
  const rows = await listCharacters();
  res.json({
    success: true,
    data: rows.map(mapCharacterRow)
  });
});

// POST /api/characters/sync
router.post('/sync', async (req: Request, res: Response) => {
  const payload = req.body?.characters;

  if (!Array.isArray(payload) || payload.length === 0) {
    return res.status(400).json({
      error: '无效数据',
      message: '请提供至少一个角色对象'
    });
  }

  const summary = {
    added: [] as string[],
    updated: [] as string[],
    skipped: [] as string[]
  };

  for (const raw of payload) {
    const normalized = normalizeCharacter(raw);
    if (!normalized) {
      summary.skipped.push(raw?.name || raw?.id || '未知');
      continue;
    }

    const existingRow = await findCharacterByName(normalized.name);
    const now = new Date().toISOString();

    if (existingRow) {
      const existing = mapCharacterRow(existingRow)!;
      const updatedCharacter = {
        id: existing.id,
        name: existing.name,
        description: normalized.description || existing.description || '',
        tags: normalized.tags.length > 0 ? normalized.tags : existing.tags || [],
        basePrompt: normalized.basePrompt || existing.basePrompt || '',
        imageUrl: existing.imageUrl || null,
        imageIsUrl: existing.imageIsUrl ?? false,
        createdAt: existing.createdAt,
        updatedAt: now
      };

      await updateCharacter(updatedCharacter);
      summary.updated.push(updatedCharacter.name);
    } else {
      const newCharacter = {
        id: raw.id || crypto.randomUUID(),
        name: normalized.name,
        description: normalized.description,
        tags: normalized.tags,
        basePrompt: normalized.basePrompt,
        imageUrl: null,
        imageIsUrl: false,
        createdAt: now,
        updatedAt: now
      };

      await insertCharacter(newCharacter);
      summary.added.push(newCharacter.name);
    }
  }

  const list = await listCharacters();

  res.json({
    success: true,
    data: {
      summary,
      list: list.map(mapCharacterRow)
    }
  });
});

// GET /api/characters/:id
router.get('/:id', async (req: Request, res: Response) => {
  const row = await getCharacterById(req.params.id);

  if (!row) {
    return res.status(404).json({
      error: '未找到角色',
      message: `ID ${req.params.id} 的角色不存在`
    });
  }

  res.json({
    success: true,
    data: mapCharacterRow(row)
  });
});

// POST /api/characters
router.post('/', async (req: Request, res: Response) => {
  const { name, description, tags, basePrompt } = req.body ?? {};

  if (!name) {
    return res.status(400).json({
      error: '缺少必要参数',
      message: '角色名称不能为空'
    });
  }

  const now = new Date().toISOString();
  const newCharacter = {
    id: req.body.id || crypto.randomUUID(),
    name: String(name).trim(),
    description: description ? String(description).trim() : '',
    tags: Array.isArray(tags) ? tags : [],
    basePrompt: basePrompt ? String(basePrompt).trim() : '',
    imageUrl: null,
    imageIsUrl: false,
    createdAt: now,
    updatedAt: now
  };

  await insertCharacter(newCharacter);

  res.status(201).json({
    success: true,
    data: newCharacter
  });
});

// PUT /api/characters/:id
router.put('/:id', async (req: Request, res: Response) => {
  const row = await getCharacterById(req.params.id);

  if (!row) {
    return res.status(404).json({
      error: '未找到角色',
      message: `ID ${req.params.id} 的角色不存在`
    });
  }

  const existing = mapCharacterRow(row)!;
  const { name, description, tags, basePrompt, imageUrl, imageIsUrl } = req.body ?? {};

  // 调试日志
  console.log('[PUT /characters/:id] 收到更新请求:', {
    id: req.params.id,
    hasImageUrl: imageUrl !== undefined,
    imageUrlType: typeof imageUrl,
    imageUrlLength: imageUrl?.length,
    imageIsUrl
  });

  const updatedCharacter = {
    id: existing.id,
    name: name !== undefined ? String(name).trim() : existing.name,
    description: description !== undefined ? String(description || '').trim() : existing.description,
    tags: Array.isArray(tags) ? tags : existing.tags || [],
    basePrompt: basePrompt !== undefined ? String(basePrompt || '').trim() : existing.basePrompt || '',
    // 修复：正确处理 imageUrl，包括空字符串和 null
    imageUrl: imageUrl !== undefined ? (imageUrl || null) : existing.imageUrl || null,
    imageIsUrl: imageIsUrl !== undefined ? Boolean(imageIsUrl) : existing.imageIsUrl ?? false,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };

  console.log('[PUT /characters/:id] 准备保存:', {
    id: updatedCharacter.id,
    hasImageUrl: !!updatedCharacter.imageUrl,
    imageUrlLength: updatedCharacter.imageUrl?.length,
    imageIsUrl: updatedCharacter.imageIsUrl
  });

  await updateCharacter(updatedCharacter);

  // 重新从数据库读取，确保返回最新数据
  const updatedRow = await getCharacterById(req.params.id);
  const finalCharacter = mapCharacterRow(updatedRow);

  console.log('[PUT /characters/:id] 保存后读取:', {
    id: finalCharacter?.id,
    hasImageUrl: !!finalCharacter?.imageUrl,
    imageUrlLength: finalCharacter?.imageUrl?.length
  });

  res.json({
    success: true,
    data: finalCharacter
  });
});

// DELETE /api/characters/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const changes = await deleteCharacter(req.params.id);

  if (!changes) {
    return res.status(404).json({
      error: '未找到角色',
      message: `ID ${req.params.id} 的角色不存在`
    });
  }

  res.json({
    success: true,
    message: '角色已删除'
  });
});

function normalizeCharacter(raw: any = {}) {
  const name =
    raw.name ||
    raw.fullName ||
    raw.character ||
    raw.id ||
    raw.alias ||
    '';

  if (!name || typeof name !== 'string') {
    return null;
  }

  const description =
    raw.description ||
    raw.role ||
    raw.background ||
    raw.personality ||
    '';

  const tagsSource =
    raw.tags ||
    raw.traits ||
    raw.attributes ||
    raw.keywords ||
    [];

  let tags: string[] = [];
  if (Array.isArray(tagsSource)) {
    tags = tagsSource as string[];
  } else if (typeof tagsSource === 'string') {
    tags = tagsSource.split(/[,，、]/);
  }

  const basePrompt =
    raw.basePrompt ||
    raw.base_prompt ||
    raw.prompt ||
    raw.visual ||
    raw.look ||
    '';

  return {
    name: name.trim(),
    description: description ? String(description).trim() : '',
    basePrompt: basePrompt ? String(basePrompt).trim() : '',
    tags: Array.from(
      new Set(
        tags
          .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
          .filter(Boolean)
      )
    )
  };
}

async function findCharacterByName(name: string) {
  const rows = await listCharacters();
  const lower = name.trim().toLowerCase();
  return rows.find(row => row.name?.toLowerCase() === lower);
}

export default router;


