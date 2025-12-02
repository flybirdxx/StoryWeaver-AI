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

const mapCharacterRow = (row) => {
  if (!row) return null;

  if (row.data) {
    try {
      const parsed = JSON.parse(row.data);
      return {
        ...parsed,
        id: row.id,
        tags: Array.isArray(parsed.tags) ? parsed.tags : parseJson(row.tags, []),
        imageIsUrl: Boolean(parsed.imageIsUrl ?? row.image_is_url)
      };
    } catch (_) {
      // fall through
    }
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    tags: parseJson(row.tags, []),
    basePrompt: row.base_prompt || '',
    imageUrl: row.image_url || null,
    imageIsUrl: Boolean(row.image_is_url),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const insertCharacter = (character) => {
  const stmt = db.prepare(`
    INSERT INTO characters
      (id, name, description, tags, base_prompt, image_url, image_is_url, data, created_at, updated_at)
    VALUES
      (@id, @name, @description, @tags, @basePrompt, @imageUrl, @imageIsUrl, @data, @createdAt, @updatedAt)
  `);

  stmt.run({
    ...character,
    tags: JSON.stringify(character.tags || []),
    imageIsUrl: character.imageIsUrl ? 1 : 0,
    data: JSON.stringify(character)
  });
};

const updateCharacterRow = (character) => {
  const stmt = db.prepare(`
    UPDATE characters
    SET name = @name,
        description = @description,
        tags = @tags,
        base_prompt = @basePrompt,
        image_url = @imageUrl,
        image_is_url = @imageIsUrl,
        data = @data,
        updated_at = @updatedAt
    WHERE id = @id
  `);

  stmt.run({
    ...character,
    tags: JSON.stringify(character.tags || []),
    imageIsUrl: character.imageIsUrl ? 1 : 0,
    data: JSON.stringify(character)
  });
};

/**
 * GET /api/characters
 * 获取所有角色
 */
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM characters ORDER BY datetime(updated_at) DESC').all();
  res.json({
    success: true,
    data: rows.map(mapCharacterRow)
  });
});

/**
 * GET /api/characters/:id
 * 获取单个角色
 */
router.post('/sync', (req, res) => {
  const payload = req.body?.characters;

  if (!Array.isArray(payload) || payload.length === 0) {
    return res.status(400).json({
      error: '无效数据',
      message: '请提供至少一个角色对象'
    });
  }

  const summary = {
    added: [],
    updated: [],
    skipped: []
  };

  payload.forEach(raw => {
    const normalized = normalizeCharacter(raw);
    if (!normalized) {
      summary.skipped.push(raw?.name || raw?.id || '未知');
      return;
    }

    const existingRow = db
      .prepare('SELECT * FROM characters WHERE LOWER(name) = LOWER(?)')
      .get(normalized.name.trim());

    const now = new Date().toISOString();

    if (existingRow) {
      const existing = mapCharacterRow(existingRow);
      const updatedCharacter = {
        ...existing,
        ...(normalized.description && { description: normalized.description }),
        ...(normalized.basePrompt && { basePrompt: normalized.basePrompt }),
        ...(normalized.tags.length > 0 && { tags: normalized.tags }),
        updatedAt: now
      };

      updateCharacterRow(updatedCharacter);
      summary.updated.push(updatedCharacter.name);
    } else {
      const newCharacter = {
        id: uuidv4(),
        name: normalized.name,
        description: normalized.description,
        tags: normalized.tags,
        basePrompt: normalized.basePrompt,
        imageUrl: null,
        imageIsUrl: false,
        createdAt: now,
        updatedAt: now
      };

      insertCharacter(newCharacter);
      summary.added.push(newCharacter.name);
    }
  });

  const list = db.prepare('SELECT * FROM characters ORDER BY datetime(updated_at) DESC').all();

  res.json({
    success: true,
    data: {
      summary,
      list: list.map(mapCharacterRow)
    }
  });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  
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

/**
 * POST /api/characters
 * 创建新角色
 */
router.post('/', (req, res) => {
  const { name, description, tags, basePrompt } = req.body;

  if (!name) {
    return res.status(400).json({
      error: '缺少必要参数',
      message: '角色名称不能为空'
    });
  }

  const now = new Date().toISOString();
  const newCharacter = {
    id: uuidv4(),
    name: name.trim(),
    description: description ? description.trim() : '',
    tags: Array.isArray(tags) ? tags : [],
    basePrompt: basePrompt ? basePrompt.trim() : '',
    imageUrl: null,
    imageIsUrl: false,
    createdAt: now,
    updatedAt: now
  };

  insertCharacter(newCharacter);

  res.status(201).json({
    success: true,
    data: newCharacter
  });
});

/**
 * PUT /api/characters/:id
 * 更新角色
 */
router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  
  if (!row) {
    return res.status(404).json({
      error: '未找到角色',
      message: `ID ${req.params.id} 的角色不存在`
    });
  }

  const existing = mapCharacterRow(row);
  const { name, description, tags, basePrompt, imageUrl, imageIsUrl } = req.body;
  const updatedCharacter = {
    ...existing,
    ...(name !== undefined && { name: name.trim() }),
    ...(description !== undefined && { description: description || '' }),
    ...(Array.isArray(tags) && { tags }),
    ...(basePrompt !== undefined && { basePrompt: basePrompt || '' }),
    ...(imageUrl !== undefined && { imageUrl }),
    ...(imageIsUrl !== undefined && { imageIsUrl: Boolean(imageIsUrl) }),
    updatedAt: new Date().toISOString()
  };

  updateCharacterRow(updatedCharacter);

  res.json({
    success: true,
    data: updatedCharacter
  });
});

/**
 * DELETE /api/characters/:id
 * 删除角色
 */
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
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

function normalizeCharacter(raw = {}) {
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

  let tags = [];
  if (Array.isArray(tagsSource)) {
    tags = tagsSource;
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
    description: description ? description.trim() : '',
    basePrompt: basePrompt ? basePrompt.trim() : '',
    tags: Array.from(
      new Set(
        tags
          .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
          .filter(Boolean)
      )
    )
  };
}

module.exports = router;

