const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// 内存存储（实际应用中应使用数据库）
let characters = [
  {
    id: '1',
    name: 'Akira (晃)',
    description: '侦探',
    tags: ['侦探', '冷酷'],
    basePrompt: 'Silver messy hair, sharp red eyes, wearing a worn-out beige trench coat, black turtleneck, cybernetic left arm visible',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Yuna (优奈)',
    description: '黑客',
    tags: ['黑客', '活泼'],
    basePrompt: 'Short purple bob cut, neon green visor glasses, oversized hoodie with graphic print, holding a holographic tablet',
    createdAt: new Date().toISOString()
  }
];

/**
 * GET /api/characters
 * 获取所有角色
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: characters
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

    const existing = characters.find(
      c => c.name.toLowerCase() === normalized.name.toLowerCase()
    );

    if (existing) {
      const updatedCharacter = {
        ...existing,
        ...(normalized.description && { description: normalized.description }),
        ...(normalized.basePrompt && { basePrompt: normalized.basePrompt }),
        ...(normalized.tags.length > 0 && { tags: normalized.tags }),
        updatedAt: new Date().toISOString()
      };

      const index = characters.findIndex(c => c.id === existing.id);
      characters[index] = updatedCharacter;
      summary.updated.push(updatedCharacter.name);
    } else {
      const newCharacter = {
        id: uuidv4(),
        name: normalized.name,
        description: normalized.description,
        tags: normalized.tags,
        basePrompt: normalized.basePrompt,
        createdAt: new Date().toISOString()
      };
      characters.push(newCharacter);
      summary.added.push(newCharacter.name);
    }
  });

  res.json({
    success: true,
    data: {
      summary,
      list: characters
    }
  });
});

router.get('/:id', (req, res) => {
  const character = characters.find(c => c.id === req.params.id);
  
  if (!character) {
    return res.status(404).json({
      error: '未找到角色',
      message: `ID ${req.params.id} 的角色不存在`
    });
  }

  res.json({
    success: true,
    data: character
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

  const newCharacter = {
    id: uuidv4(),
    name,
    description: description || '',
    tags: tags || [],
    basePrompt: basePrompt || '',
    createdAt: new Date().toISOString()
  };

  characters.push(newCharacter);

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
  const characterIndex = characters.findIndex(c => c.id === req.params.id);
  
  if (characterIndex === -1) {
    return res.status(404).json({
      error: '未找到角色',
      message: `ID ${req.params.id} 的角色不存在`
    });
  }

  const { name, description, tags, basePrompt, imageUrl, imageIsUrl } = req.body;
  
  characters[characterIndex] = {
    ...characters[characterIndex],
    ...(name && { name }),
    ...(description !== undefined && { description }),
    ...(tags && { tags }),
    ...(basePrompt !== undefined && { basePrompt }),
    ...(imageUrl !== undefined && { imageUrl }),
    ...(imageIsUrl !== undefined && { imageIsUrl }),
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: characters[characterIndex]
  });
});

/**
 * DELETE /api/characters/:id
 * 删除角色
 */
router.delete('/:id', (req, res) => {
  const characterIndex = characters.findIndex(c => c.id === req.params.id);
  
  if (characterIndex === -1) {
    return res.status(404).json({
      error: '未找到角色',
      message: `ID ${req.params.id} 的角色不存在`
    });
  }

  characters.splice(characterIndex, 1);

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

