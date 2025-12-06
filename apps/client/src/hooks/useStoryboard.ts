import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../stores/useProjectStore';
import type { Panel } from '@storyweaver/shared';

interface UseStoryboardReturn {
  panels: Panel[];
  selectedPanelId: string | number | null;
  isLoading: boolean;
  isGenerating: boolean;
  generatingPanelId: string | number | null; // 正在生成的分镜 ID
  generationProgress: { current: number; total: number } | null; // 批量生成进度
  loadPanels: () => void;
  selectPanel: (id: string | number) => void;
  updatePanelImage: (id: string | number, imageUrl: string, isUrl?: boolean) => void;
  generateImages: (style: string, options?: { aspectRatio?: string; imageSize?: string }) => Promise<void>;
  generateBatchImages: (selectedPanels: Panel[], style: string, options?: { aspectRatio?: string; imageSize?: string }) => Promise<void>;
  regenerateSinglePanel: (panelId: string | number, style: string, options?: { aspectRatio?: string; imageSize?: string }) => Promise<void>;
}

export function useStoryboard(): UseStoryboardReturn {
  // 使用 Zustand Store 管理全局状态
  const panels = useProjectStore((state) => state.panels);
  const selectedPanelId = useProjectStore((state) => state.selectedPanelId);
  const setPanels = useProjectStore((state) => state.setPanels);
  const setSelectedPanelId = useProjectStore((state) => state.setSelectedPanelId);
  const updatePanelImage = useProjectStore((state) => state.updatePanelImage);
  
  // UI 状态保持局部（不需要全局）
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPanelId, setGeneratingPanelId] = useState<string | number | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);

  // 只在组件挂载时加载一次，避免点击时重新加载覆盖已生成的图像
  const loadPanels = useCallback(() => {
    try {
    const storyboardData = (window as any).storyboardData;
      if (storyboardData && storyboardData.panels && Array.isArray(storyboardData.panels)) {
      const loadedPanels = storyboardData.panels;
        
        // 智能合并：保留 store 中已有的图像数据
        const currentPanels = useProjectStore.getState().panels;
        const mergedPanels = loadedPanels.map((loadedPanel: Panel) => {
          const existingPanel = currentPanels.find(p => p.id === loadedPanel.id);
          // 如果 store 中的面板有图像，保留它（可能是刚生成的）
          if (existingPanel?.imageUrl) {
            return {
              ...loadedPanel,
              imageUrl: existingPanel.imageUrl,
              imageIsUrl: existingPanel.imageIsUrl,
              status: existingPanel.status || loadedPanel.status
            };
          }
          return loadedPanel;
        });
        
        setPanels(mergedPanels);
      // 如果当前没有选中分镜，自动选中第一个
        const currentSelectedId = useProjectStore.getState().selectedPanelId;
        if (mergedPanels.length > 0 && !currentSelectedId) {
          setSelectedPanelId(mergedPanels[0].id);
      }
        console.log('已加载分镜数据:', mergedPanels.length, '个分镜');
    } else {
      console.log('未找到分镜数据，请先在剧本中心分析剧本');
        // 只有在确实没有数据时才清空，避免覆盖正在生成的数据
        const currentPanels = useProjectStore.getState().panels;
        if (currentPanels.length === 0) {
      setPanels([]);
      setSelectedPanelId(null);
    }
      }
    } catch (error) {
      console.error('[useStoryboard] 加载分镜数据失败:', error);
      // 出错时保持当前状态，不覆盖已有数据
    }
  }, [setPanels, setSelectedPanelId]);

  // 只在组件挂载时加载一次，避免重复加载覆盖数据
  useEffect(() => {
    loadPanels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只在挂载时执行一次

  const selectPanel = useCallback((id: string | number) => {
    setSelectedPanelId(id);
  }, [setSelectedPanelId]);

  // updatePanelImage 现在直接使用 Store 的方法
  const handleUpdatePanelImage = useCallback((id: string | number, imageUrl: string, isUrl = false) => {
    // 先更新 Store
    updatePanelImage(id, imageUrl, isUrl);
    
    // 同步更新全局数据（保持向后兼容）
    const storyboardData = (window as any).storyboardData;
    if (storyboardData && storyboardData.panels) {
      const updated = storyboardData.panels.map((panel: Panel) =>
        panel.id === id ? { ...panel, imageUrl, imageIsUrl: isUrl, status: 'completed' } : panel
      );
      // 创建新对象避免只读属性错误
      try {
        (window as any).storyboardData = {
          ...storyboardData,
          panels: updated
        };
      } catch (error) {
        console.warn('[useStoryboard] 无法更新 window.storyboardData:', error);
      }
      console.log('[useStoryboard] 已同步更新 window.storyboardData，面板 ID:', id);
    } else {
      // 如果 storyboardData 不存在，从 store 创建它
      const currentPanels = useProjectStore.getState().panels;
      (window as any).storyboardData = {
        panels: currentPanels,
        timestamp: new Date().toISOString()
      };
      console.log('[useStoryboard] 创建了新的 window.storyboardData');
    }
  }, [updatePanelImage]);

  const generateImages = useCallback(
    async (style: string, options: { aspectRatio?: string; imageSize?: string } = {}) => {
      if (panels.length === 0) {
        toast.warning('请先分析剧本生成分镜数据', '请前往"剧本中心"输入剧本并点击"AI 导演分析"');
        return;
      }

      const characters = (window as any).charactersData || [];
      const characterRefs: Record<string, string> = {};
      characters.forEach((char: any) => {
        if (char.basePrompt) {
          characterRefs[char.name] = char.basePrompt;
        }
      });

      const batchSize = 3;
      const batchCount = Math.ceil(panels.length / batchSize);
      const confirmMsg =
        panels.length > batchSize
          ? `[电影模式] 将为 ${panels.length} 个分镜生成电影风格图像，将自动分成 ${batchCount} 批处理（每批 ${batchSize} 个），这可能需要较长时间。是否继续？`
          : `[电影模式] 将为 ${panels.length} 个分镜生成电影风格图像，这可能需要一些时间。是否继续？`;

      if (!confirm(confirmMsg)) {
        return;
      }

      setIsGenerating(true);

      const imageOptions = {
        aspectRatio: options.aspectRatio || '16:9',
        imageSize: options.imageSize || '4K'
      };

      const apiKey = localStorage.getItem('gemini_api_key') || '';

      try {
        const url = '/api/image/generate-batch-stream';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {})
          },
          body: JSON.stringify({
            panels,
            style,
            characterRefs,
            options: imageOptions
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取响应流');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let successCount = 0;
        let failedCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case 'generating':
                    console.log(`[流式] 正在生成分镜 ${data.panelId}...`);
                    setGeneratingPanelId(data.panelId);
                    break;

                  case 'batch-start':
                    setGenerationProgress({ current: 0, total: data.panelIds?.length || panels.length });
                    break;

                  case 'success':
                    const panelData = data.data;
                    if (panelData && panelData.panelId && panelData.imageUrl) {
                      handleUpdatePanelImage(
                        panelData.panelId,
                        panelData.imageUrl,
                        panelData.isUrl || false
                      );
                      successCount++;
                      console.log(`✓ 分镜 ${panelData.panelId} 图像已生成`);
                      // 更新进度
                      setGenerationProgress(prev => prev ? {
                        current: prev.current + 1,
                        total: prev.total
                      } : null);
                    }
                    break;

                  case 'error':
                    failedCount++;
                    console.error(`✗ 分镜 ${data.data?.panelId || '未知'} 生成失败:`, data.data?.error || data.message);
                    // 更新进度（即使失败也计入进度）
                    setGenerationProgress(prev => prev ? {
                      current: prev.current + 1,
                      total: prev.total
                    } : null);
                    break;

                  case 'complete':
                    console.log(`[流式] 全部完成！成功: ${data.success}，失败: ${data.failed}`);
                    setGenerationProgress(null);
                    setGeneratingPanelId(null);
                    const modeName = '电影模式';
                    if (data.failed > 0) {
                      const errorDetails = (data.errors || [])
                        .map((e: any) => `分镜 #${e.panelId}: ${e.error}`)
                        .join('\n');
                      toast.warning(
                        `[${modeName}] 生成完成！成功: ${data.success} 张，失败: ${data.failed} 张`,
                        errorDetails
                      );
                    } else if (data.success > 0) {
                      toast.success(`[${modeName}] 成功生成 ${data.success} 张图像！`);
                    }
                    break;
                }
              } catch (parseError) {
                console.error('解析 SSE 数据失败:', parseError, line);
              }
            }
          }
        }
      } catch (error: any) {
        console.error('图像生成错误:', error);
        setGenerationProgress(null);
        setGeneratingPanelId(null);
        toast.error(
          '生成失败',
          `${error.message || '未知错误'}\n\n请检查:\n1. API Key 是否正确配置且有图像生成权限\n2. 网络连接是否正常\n3. 提示词是否有效`
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [panels, handleUpdatePanelImage]
  );

  // 批量生成选中的分镜
  const generateBatchImages = useCallback(
    async (selectedPanels: Panel[], style: string, options: { aspectRatio?: string; imageSize?: string } = {}) => {
      if (selectedPanels.length === 0) {
        toast.warning('请先选择要生成的分镜');
        return;
      }

      const characters = (window as any).charactersData || [];
      const characterRefs: Record<string, string> = {};
      characters.forEach((char: any) => {
        if (char.basePrompt) {
          characterRefs[char.name] = char.basePrompt;
        }
      });

      const confirmMsg = `将为 ${selectedPanels.length} 个选中的分镜生成图像，是否继续？`;
      if (!confirm(confirmMsg)) {
        return;
      }

      setIsGenerating(true);

      const imageOptions = {
        aspectRatio: options.aspectRatio || '16:9',
        imageSize: options.imageSize || '4K'
      };

      const apiKey = localStorage.getItem('gemini_api_key') || '';

      try {
        // 使用批量队列接口
        const url = '/api/image/generate-batch-queue';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {})
          },
          body: JSON.stringify({
            panels: selectedPanels,
            style,
            characterRefs,
            options: imageOptions
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
          toast.success(`已提交 ${result.data?.total || selectedPanels.length} 个任务到后台队列`, '可在 Dashboard 的任务中心查看进度');
        } else {
          throw new Error(result.error || '批量生成失败');
        }
      } catch (error: any) {
        console.error('批量生成错误:', error);
        toast.error('批量生成失败', error.message || '未知错误');
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  // 重新生成单个分镜
  const regenerateSinglePanel = useCallback(
    async (panelId: string | number, style: string, options: { aspectRatio?: string; imageSize?: string } = {}) => {
      const panel = panels.find(p => p.id === panelId);
      if (!panel) {
        toast.warning('找不到指定的分镜');
        return;
      }

      if (!panel.prompt) {
        toast.warning('该分镜没有提示词，无法生成图像');
        return;
      }

      setGeneratingPanelId(panelId);
      setIsGenerating(true);

      // 更新状态为生成中
      const updatePanelStatus = useProjectStore.getState().updatePanelStatus;
      updatePanelStatus(panelId, 'generating');

      const characters = (window as any).charactersData || [];
      const characterRefs: Record<string, string> = {};
      characters.forEach((char: any) => {
        if (char.basePrompt) {
          characterRefs[char.name] = char.basePrompt;
        }
      });

      const imageOptions = {
        aspectRatio: options.aspectRatio || '16:9',
        imageSize: options.imageSize || '4K'
      };

      const apiKey = localStorage.getItem('gemini_api_key') || '';

      try {
        const url = '/api/image/generate';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {})
          },
          body: JSON.stringify({
            prompt: panel.prompt,
            style: style || 'cel-shading',
            characterRefs: characterRefs,
            aspectRatio: imageOptions.aspectRatio,
            imageSize: imageOptions.imageSize
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success && result.data && result.data.imageUrl) {
          // 更新分镜图像
          handleUpdatePanelImage(
            panelId,
            result.data.imageUrl,
            result.data.isUrl || false
          );
          // 更新状态为已完成
          updatePanelStatus(panelId, 'completed', result.data.imageUrl);
          console.log(`✓ 分镜 ${panelId} 重新生成成功`);
        } else {
          throw new Error(result.error || '生成失败：未返回图像数据');
        }
      } catch (error: any) {
        console.error(`分镜 ${panelId} 重新生成失败:`, error);
        // 更新状态为失败
        updatePanelStatus(panelId, 'failed');
        toast.error('重新生成失败', `${error.message || '未知错误'}\n\n请检查:\n1. API Key 是否正确配置\n2. 网络连接是否正常\n3. 提示词是否有效`);
      } finally {
        setGeneratingPanelId(null);
        setIsGenerating(false);
      }
    },
    [panels, handleUpdatePanelImage]
  );

  return {
    panels,
    selectedPanelId,
    isLoading,
    isGenerating,
    generatingPanelId,
    loadPanels,
    selectPanel,
    updatePanelImage: handleUpdatePanelImage,
    generateImages,
    generateBatchImages,
    regenerateSinglePanel
  };
}

