import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../stores/useProjectStore';
import type { Panel } from '@storyweaver/shared';

interface UseStoryboardReturn {
  panels: Panel[];
  selectedPanelId: string | number | null;
  isLoading: boolean;
  isGenerating: boolean;
  loadPanels: () => void;
  selectPanel: (id: string | number) => void;
  updatePanelImage: (id: string | number, imageUrl: string, isUrl?: boolean) => void;
  generateImages: (style: string, options?: { aspectRatio?: string; imageSize?: string }) => Promise<void>;
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

  const loadPanels = useCallback(() => {
    const storyboardData = (window as any).storyboardData;
    if (storyboardData && storyboardData.panels) {
      const loadedPanels = storyboardData.panels;
      setPanels(loadedPanels);
      // 如果当前没有选中分镜，自动选中第一个
      if (loadedPanels.length > 0 && !selectedPanelId) {
        setSelectedPanelId(loadedPanels[0].id);
      }
      console.log('已加载分镜数据:', loadedPanels.length, '个分镜');
    } else {
      console.log('未找到分镜数据，请先在剧本中心分析剧本');
      setPanels([]);
      setSelectedPanelId(null);
    }
  }, [selectedPanelId, setPanels, setSelectedPanelId]);

  useEffect(() => {
    loadPanels();
  }, [loadPanels]);

  const selectPanel = useCallback((id: string | number) => {
    setSelectedPanelId(id);
  }, [setSelectedPanelId]);

  // updatePanelImage 现在直接使用 Store 的方法
  const handleUpdatePanelImage = useCallback((id: string | number, imageUrl: string, isUrl = false) => {
    updatePanelImage(id, imageUrl, isUrl);
    // 同步更新全局数据（保持向后兼容）
    const storyboardData = (window as any).storyboardData;
    if (storyboardData && storyboardData.panels) {
      const updated = storyboardData.panels.map((panel: Panel) =>
        panel.id === id ? { ...panel, imageUrl, imageIsUrl: isUrl } : panel
      );
      storyboardData.panels = updated;
    }
  }, [updatePanelImage]);

  const generateImages = useCallback(
    async (style: string, options: { aspectRatio?: string; imageSize?: string } = {}) => {
      if (panels.length === 0) {
        alert('请先分析剧本生成分镜数据\n\n请前往"剧本中心"输入剧本并点击"AI 导演分析"');
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
                    }
                    break;

                  case 'error':
                    failedCount++;
                    console.error(`✗ 分镜 ${data.data?.panelId || '未知'} 生成失败:`, data.data?.error || data.message);
                    break;

                  case 'complete':
                    console.log(`[流式] 全部完成！成功: ${data.success}，失败: ${data.failed}`);
                    const modeName = '电影模式';
                    if (data.failed > 0) {
                      const errorDetails = (data.errors || [])
                        .map((e: any) => `分镜 #${e.panelId}: ${e.error}`)
                        .join('\n');
                      alert(
                        `[${modeName}] 生成完成！成功: ${data.success} 张，失败: ${data.failed} 张\n\n失败详情:\n${errorDetails}`
                      );
                    } else if (data.success > 0) {
                      alert(`[${modeName}] 成功生成 ${data.success} 张图像！`);
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
        alert(
          `生成失败: ${error.message || '未知错误'}\n\n请检查:\n1. API Key 是否正确配置且有图像生成权限\n2. 网络连接是否正常\n3. 提示词是否有效`
        );
      } finally {
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
    loadPanels,
    selectPanel,
    updatePanelImage: handleUpdatePanelImage,
    generateImages
  };
}

