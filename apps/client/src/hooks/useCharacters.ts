import { useState, useEffect, useCallback } from 'react';
import { useApiQuery, useApiMutation } from './useApiQuery';
import { apiRequest } from '../lib/api';
import { useCharacterStore } from '../stores/useCharacterStore';
import type { Character } from '@storyweaver/shared';

interface UseCharactersReturn {
  characters: Character[];
  isLoading: boolean;
  error: string | null;
  loadCharacters: () => Promise<void>;
  createCharacter: (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCharacter: (id: string, data: Partial<Character>) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  generateImage: (id: string) => Promise<void>;
  syncFromAnalysis: (extractedCharacters: any[]) => Promise<void>;
}

export function useCharacters(): UseCharactersReturn {
  // 使用 Zustand Store 管理全局状态
  const characters = useCharacterStore((state) => state.characters);
  const setCharacters = useCharacterStore((state) => state.setCharacters);
  const addCharacter = useCharacterStore((state) => state.addCharacter);
  const updateCharacterStore = useCharacterStore((state) => state.updateCharacter);
  const removeCharacterStore = useCharacterStore((state) => state.removeCharacter);
  
  // UI 状态保持局部
  const [localError, setLocalError] = useState<string | null>(null);

  // 使用 TanStack Query 获取角色列表
  const {
    data: charactersData,
    isLoading: queryLoading,
    error: queryError,
    refetch: refetchCharacters,
  } = useApiQuery<Character[]>(['characters'], '/characters');

  // 同步查询结果到 Store
  useEffect(() => {
    if (charactersData) {
      setCharacters(charactersData);
      // 保存到全局变量（供其他模块使用，向后兼容）
      (window as any).charactersData = charactersData;
    }
  }, [charactersData, setCharacters]);

  // 合并加载状态和错误
  const isLoading = queryLoading;
  const error = queryError ? (queryError as Error).message : localError;

  const loadCharacters = useCallback(async () => {
    await refetchCharacters();
  }, [refetchCharacters]);

  // 使用 TanStack Query Mutation 创建角色
  const createMutation = useApiMutation<Character, Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>(
    '/characters',
    'POST',
    {
      invalidateQueries: [['characters']],
      onSuccess: (data) => {
        addCharacter(data);
        const updated = useCharacterStore.getState().characters;
        (window as any).charactersData = updated;
      },
      onError: (err) => {
        setLocalError(err.message || '创建角色失败');
      },
    }
  );

  const createCharacter = useCallback(
    async (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        await createMutation.mutateAsync(data);
      } catch (err) {
        throw err;
      }
    },
    [createMutation]
  );

  // 使用 TanStack Query Mutation 更新角色
  const updateMutation = useApiMutation<Character, { id: string; data: Partial<Character> }>(
    (variables) => `/characters/${variables.id}`,
    'PUT',
    {
      invalidateQueries: [['characters']],
      onSuccess: (data, variables) => {
        updateCharacterStore(variables.id, data);
        const updated = useCharacterStore.getState().characters;
        (window as any).charactersData = updated;
      },
      onError: (err) => {
        setLocalError(err.message || '更新角色失败');
      },
    }
  );

  const updateCharacter = useCallback(
    async (id: string, data: Partial<Character>) => {
      try {
        await updateMutation.mutateAsync({ id, data });
      } catch (err) {
        throw err;
      }
    },
    [updateMutation]
  );

  // 使用 TanStack Query Mutation 删除角色
  const deleteMutation = useApiMutation<void, { id: string }>(
    (variables) => `/characters/${variables.id}`,
    'DELETE',
    {
      invalidateQueries: [['characters']],
      onSuccess: (_, variables) => {
        removeCharacterStore(variables.id);
        const updated = useCharacterStore.getState().characters;
        (window as any).charactersData = updated;
      },
      onError: (err) => {
        setLocalError(err.message || '删除角色失败');
        alert(`删除角色失败: ${err.message}`);
      },
    }
  );

  const deleteCharacter = useCallback(
    async (id: string) => {
      if (!confirm('确定要删除这个角色吗？')) {
        return;
      }
      try {
        await deleteMutation.mutateAsync({ id });
      } catch (err) {
        // 错误已在 onError 中处理
      }
    },
    [deleteMutation]
  );

  const generateImage = useCallback(async (id: string) => {
    const char = characters.find(c => c.id === id);
    if (!char) return;

    const name = char.name || '';
    const tags = Array.isArray(char.tags) ? char.tags : [];
    const description = char.description || '';
    const basePrompt = char.basePrompt || '';

    const promptParts = [
      basePrompt,
      description,
      tags.length ? `traits: ${tags.join(', ')}` : '',
      name ? `character: ${name}` : ''
    ].filter(Boolean);

    if (promptParts.length === 0) {
      alert('该角色缺少基础提示信息，无法生成参考图像。请先补充描述或标签。');
      return;
    }

    // 构建三视图提示词：要求生成完整的角色三视图（正面、侧面、背面）
    // 使用 3:4 或 2:3 比例，确保角色完整显示
    const threeViewPrompt = `Generate a character reference sheet showing full body character design. ${promptParts.join('. ')}. 
Character sheet layout: front view on left, side view in center, back view on right. 
Full body visible from head to toe, no cropping. Character design sheet style, clean white background, professional character reference format. 
All three views should show the complete character clearly and consistently.`;

    try {
      const response = await apiRequest<{ imageUrl: string; isUrl?: boolean }>('/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: threeViewPrompt,
          style: 'cel-shading',
          aspectRatio: '3:4', // 使用 3:4 比例，更适合显示完整角色
          imageSize: '2K'
        })
      });

      if (!response.success || !response.data || !response.data.imageUrl) {
        alert('生成角色参考图失败，请稍后重试。');
        return;
      }

      const { imageUrl, isUrl } = response.data;

      // 如果返回的是 base64 数据 URL，检查大小
      // 如果过大（> 5MB），建议使用 URL 而不是 base64
      if (!isUrl && imageUrl && imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.split(',')[1] || '';
        const sizeInBytes = (base64Data.length * 3) / 4; // base64 编码大小估算
        const sizeInMB = sizeInBytes / (1024 * 1024);
        
        if (sizeInMB > 5) {
          console.warn(`角色图像较大 (${sizeInMB.toFixed(2)}MB)，建议保存为文件而不是 base64`);
        }
      }

      // 更新角色图像
      await updateCharacter(id, {
        imageUrl,
        imageIsUrl: isUrl || false
      });
    } catch (err: any) {
      console.error('生成角色图像失败:', err);
      alert(`生成角色参考图失败: ${err.message}`);
    }
  }, [characters, updateCharacter]);

  const syncFromAnalysis = useCallback(async (extractedCharacters: any[]) => {
    if (!Array.isArray(extractedCharacters) || extractedCharacters.length === 0) {
      return;
    }

    // 规范化角色数据（兼容多种 LLM 输出格式）
    const normalized = extractedCharacters
      .map((item) => {
        if (!item) return null;

        // 纯字符串：视为角色名
        if (typeof item === 'string') {
          return { name: item };
        }

        if (typeof item === 'object') {
          let name =
            item.name ||
            item.fullName ||
            item.character ||
            item.id ||
            item.alias;

          if (!name || typeof name !== 'string') {
            return null;
          }

          let description =
            item.description ||
            item.role ||
            item.background ||
            item.personality ||
            '';

          const tagsSource =
            item.tags ||
            item.traits ||
            item.attributes ||
            item.keywords ||
            [];

          let tags: string[] = [];
          if (Array.isArray(tagsSource)) {
            tags = tagsSource;
          } else if (typeof tagsSource === 'string') {
            tags = tagsSource.split(/[,，、]/);
          }

          let basePrompt =
            item.basePrompt ||
            item.base_prompt ||
            item.prompt ||
            item.visual ||
            item.look ||
            '';

          // 统一角色名：去掉括号及之后的英文补充
          name = name.split(/[(（]/)[0].trim();

          const cleanTags = tags
            .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
            .filter(Boolean);

          description = description ? description.trim() : '';
          basePrompt = basePrompt ? basePrompt.trim() : '';

          // 如果没有提供 basePrompt，则根据描述和标签自动拼一个基础提示词
          if (!basePrompt && (description || cleanTags.length)) {
            basePrompt = [
              description,
              cleanTags.length ? `traits: ${cleanTags.join(', ')}` : ''
            ]
              .filter(Boolean)
              .join('. ');
          }

          return {
            name,
            description,
            basePrompt,
            tags: cleanTags
          };
        }

        return null;
      })
      .filter(Boolean);

    if (normalized.length === 0) {
      console.warn('[角色库] 脚本分析返回的角色列表无法解析，已跳过自动同步。原始数据:', extractedCharacters);
      return;
    }

    try {
      const response = await apiRequest<{ list: Character[]; summary: any }>('/characters/sync', {
        method: 'POST',
        body: JSON.stringify({ characters: normalized })
      });

      if (response.success && response.data) {
        const syncedCharacters = response.data.list || [];
        setCharacters(syncedCharacters);
        (window as any).charactersData = syncedCharacters;
        console.log('[角色库] 已同步脚本中的角色:', response.data.summary);
      }
    } catch (err) {
      console.error('同步角色失败:', err);
    }
  }, [setCharacters]);

  return {
    characters,
    isLoading,
    error,
    loadCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    generateImage,
    syncFromAnalysis
  };
}

