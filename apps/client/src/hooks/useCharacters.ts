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

  // 同步查询结果到 Store（智能合并，避免覆盖本地更新）
  useEffect(() => {
    if (charactersData) {
      console.log('[useCharacters] 同步查询结果到 Store:', {
        count: charactersData.length,
        characters: charactersData.map(c => ({
          id: c.id,
          name: c.name,
          hasImageUrl: !!c.imageUrl,
          imageUrlLength: c.imageUrl?.length
        }))
      });
      
      // 获取当前 store 中的角色
      const currentCharacters = useCharacterStore.getState().characters;
      
      // 智能合并：如果 store 中的角色有 imageUrl 但查询结果中没有，保留 store 中的
      const merged = charactersData.map(serverChar => {
        const localChar = currentCharacters.find(c => c.id === serverChar.id);
        // 如果本地有 imageUrl 但服务器没有，保留本地的（可能是刚生成的）
        if (localChar?.imageUrl && !serverChar.imageUrl) {
          console.log(`[useCharacters] 保留本地 imageUrl 给角色 ${serverChar.name}`);
          return { ...serverChar, imageUrl: localChar.imageUrl, imageIsUrl: localChar.imageIsUrl };
        }
        return serverChar;
      });
      
      setCharacters(merged);
      // 保存到全局变量（供其他模块使用，向后兼容）
      (window as any).charactersData = merged;
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
      // 注意：invalidateQueries 会在 onSuccess 之后触发，可能会覆盖 store 更新
      // 所以我们延迟 invalidate，或者确保 onSuccess 中的更新在 invalidate 之前完成
      invalidateQueries: [['characters']],
      onSuccess: (data, variables) => {
        console.log('[updateMutation] onSuccess 回调:', {
          id: variables.id,
          hasImageUrl: !!data.imageUrl,
          imageUrlLength: data.imageUrl?.length,
          fullData: data
        });
        // 确保使用服务器返回的最新数据更新 store
        updateCharacterStore(variables.id, data);
        const updated = useCharacterStore.getState().characters;
        (window as any).charactersData = updated;
        console.log('[updateMutation] Store 已更新，当前角色数:', updated.length);
        // 查找更新后的角色
        const updatedChar = updated.find(c => c.id === variables.id);
        console.log('[updateMutation] 更新后的角色:', {
          id: updatedChar?.id,
          name: updatedChar?.name,
          hasImageUrl: !!updatedChar?.imageUrl,
          imageUrlLength: updatedChar?.imageUrl?.length
        });
      },
      onError: (err) => {
        console.error('[updateMutation] onError:', err);
        setLocalError(err.message || '更新角色失败');
      },
    }
  );

  const updateCharacter = useCallback(
    async (id: string, data: Partial<Character>) => {
      try {
        // 先乐观更新本地状态（立即显示）
        console.log('[updateCharacter] 乐观更新本地状态:', { id, data });
        updateCharacterStore(id, data);
        
        // 然后同步到服务器
        const result = await updateMutation.mutateAsync({ id, data });
        
        // 如果服务器返回了完整数据，使用服务器数据（确保一致性）
        if (result) {
          console.log('[updateCharacter] 使用服务器返回的数据:', result);
          updateCharacterStore(id, result);
        } else {
          console.log('[updateCharacter] 服务器未返回完整数据，保持乐观更新');
        }
        
        // 不立即刷新，让 mutation 的 invalidateQueries 自动处理
        // 这样可以避免覆盖刚刚更新的数据
      } catch (err) {
        // 如果更新失败，从服务器重新获取数据（回滚）
        console.error('[updateCharacter] 更新失败，回滚:', err);
        await refetchCharacters();
        throw err;
      }
    },
    [updateMutation, updateCharacterStore, refetchCharacters]
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

    // 优化：Character Reference Sheet 三视图生成提示词
    // 核心指令：明确要求三视图结构
    const layoutInstructions = '(Character Reference Sheet:1.5), (Three views: Front view, Side view, Back view), full body standing pose, neutral white background, studio lighting';
    
    // 角色描述：整合用户输入
    const characterDescription = `Character Design: ${promptParts.join('. ')}`;
    
    // 风格控制：保持清晰、扁平、易于参考
    const styleControl = 'Concept Art style, flat colors, clean lines, high detail, masterpiece, best quality';
    
    // 负面提示词：防止大头照、裁剪、透视变形
    const negativePrompts = 'cropping, close-up, portrait, headshot, partial body, cut off, incomplete, perspective distortion, dynamic pose, shadow, blur, noisy';
    
    // 组合完整提示词
    const threeViewPrompt = `${layoutInstructions}. ${characterDescription}. ${styleControl}. Negative: ${negativePrompts}`;

    try {
      const response = await apiRequest<{ imageUrl: string; isUrl?: boolean }>('/image/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: threeViewPrompt,
          style: 'cel-shading',
          aspectRatio: '3:2', // 使用 3:2 比例，更适合横向三视图布局
          imageSize: '2K'
        })
      });

      if (!response.success || !response.data || !response.data.imageUrl) {
        alert('生成角色参考图失败，请稍后重试。');
        return;
      }

      const { imageUrl, isUrl } = response.data;

      console.log('[角色图像生成] 收到响应:', {
        hasImageUrl: !!imageUrl,
        isUrl,
        imageUrlLength: imageUrl?.length,
        imageUrlPrefix: imageUrl?.substring(0, 50)
      });

      if (!imageUrl) {
        console.error('[角色图像生成] 响应中没有 imageUrl');
        alert('生成角色参考图失败：服务器未返回图像数据');
        return;
      }

      // 如果返回的是 base64 数据 URL，检查格式
      let finalImageUrl = imageUrl;
      if (!isUrl && imageUrl) {
        // 确保 base64 数据有正确的 data URL 前缀
        if (!imageUrl.startsWith('data:')) {
          // 如果返回的是纯 base64，添加前缀
          if (imageUrl.includes('base64')) {
            // 已经是 data URL 格式，但可能缺少 data: 前缀
            finalImageUrl = imageUrl.startsWith('data:') ? imageUrl : `data:image/jpeg;base64,${imageUrl}`;
          } else {
            // 纯 base64 字符串，添加完整前缀
            finalImageUrl = `data:image/jpeg;base64,${imageUrl}`;
          }
        }
        
        // 检查大小
        const base64Data = finalImageUrl.split(',')[1] || '';
        const sizeInBytes = (base64Data.length * 3) / 4;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        
        console.log(`[角色图像生成] 图像大小: ${sizeInMB.toFixed(2)}MB`);
        
        if (sizeInMB > 5) {
          console.warn(`角色图像较大 (${sizeInMB.toFixed(2)}MB)，建议保存为文件而不是 base64`);
        }
      }

      // 更新角色图像
      console.log('[角色图像生成] 更新角色数据，ID:', id);
      await updateCharacter(id, {
        imageUrl: finalImageUrl,
        imageIsUrl: isUrl || false
      });
      
      console.log('[角色图像生成] 角色数据已更新');
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

