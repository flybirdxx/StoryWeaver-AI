import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { toast } from '../lib/toast';
import { useProjectStore } from '../stores/useProjectStore';

export interface ScriptAnalysisResult {
  theme?: string;
  logline?: string;
  panels: Array<{
    id: string;
    type?: string;
    prompt?: string;
    dialogue?: string;
    description?: string;
  }>;
  characters: Array<{
    name: string;
    description?: string;
    basePrompt?: string;
    tags?: string[];
  }>;
  structure?: any[];
  scenes?: any[];
  projectId?: string;
}

interface UseScriptStudioReturn {
  script: string;
  setScript: (value: string) => void;
  projectTitle: string;
  setProjectTitle: (value: string) => void;
  projectTags: string;
  setProjectTags: (value: string) => void;
  modelProvider: 'gemini' | 'deepseek';
  setModelProvider: (value: 'gemini' | 'deepseek') => void;
  analysisResult: ScriptAnalysisResult | null;
  isAnalyzing: boolean;
  analysisStatus: 'ready' | 'processing' | 'done' | 'error';
  analyzeScript: () => Promise<void>;
  saveToShelf: () => Promise<void>;
  formatAnalysisMarkdown: (result: ScriptAnalysisResult | null) => string;
  updatePanel: (id: string | number, data: Partial<ScriptAnalysisResult['panels'][0]>) => void;
  deletePanel: (id: string | number) => void;
  mergePanels: (ids: (string | number)[]) => void;
  splitPanel: (id: string | number) => void;
}

export function useScriptStudio(): UseScriptStudioReturn {
  const currentProject = useProjectStore((state) => state.currentProject);
  const updateProject = useProjectStore((state) => state.updateProject);
  const setPanels = useProjectStore((state) => state.setPanels);
  const [script, setScript] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectTags, setProjectTags] = useState('');
  const [modelProvider, setModelProvider] = useState<'gemini' | 'deepseek'>('gemini');
  const [analysisResult, setAnalysisResult] = useState<ScriptAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<'ready' | 'processing' | 'done' | 'error'>('ready');

  // 从当前项目恢复数据
  useEffect(() => {
    if (currentProject) {
      // 恢复项目标题和标签
      if (currentProject.name) setProjectTitle(currentProject.name);
      if (currentProject.tags && currentProject.tags.length > 0) {
        setProjectTags(currentProject.tags.join(', '));
      }
      
      // 恢复剧本内容
      if (currentProject.script) {
        setScript(currentProject.script);
      }
      
      // 恢复分析结果
      if (currentProject.analysis) {
        setAnalysisResult(currentProject.analysis as ScriptAnalysisResult);
        setAnalysisStatus('done');
        // 同步到全局变量
        (window as any).storyboardData = currentProject.analysis;
        // 同步角色数据
        if (currentProject.analysis.characters) {
          (window as any).charactersData = currentProject.analysis.characters;
        }
      }
    }
  }, [currentProject?.id]); // 只在项目 ID 变化时恢复

  // 从 localStorage 加载保存的值（作为后备）
  useEffect(() => {
    if (!currentProject) {
      const savedTitle = localStorage.getItem('script_project_title');
      const savedTags = localStorage.getItem('script_project_tags');
      const savedModel = localStorage.getItem('script_model_provider');
      
      if (savedTitle) setProjectTitle(savedTitle);
      if (savedTags) setProjectTags(savedTags);
      if (savedModel === 'deepseek' || savedModel === 'gemini') {
        setModelProvider(savedModel);
      }
    }
  }, [currentProject]);

  // 保存模型选择到 localStorage
  useEffect(() => {
    localStorage.setItem('script_model_provider', modelProvider);
  }, [modelProvider]);

  const formatAnalysisMarkdown = useCallback((result: ScriptAnalysisResult | null): string => {
    if (!result) return '// 暂无分析结果';

    const characters = Array.isArray(result.characters) ? result.characters : [];
    const panels = Array.isArray(result.panels) ? result.panels.slice(0, 5) : [];

    const lines = [
      '# 🎬 剧本分析摘要',
      '',
      `- 主题：${result.theme || '未知'}`,
      `- 分镜数量：${result.panels?.length || 0}`,
      `- 生成时间：${new Date().toLocaleString()}`,
      '',
      '## 角色一览'
    ];

    if (characters.length === 0) {
      lines.push('_暂无角色数据_');
    } else {
      lines.push(
        ...characters.map(char => {
          const tags = Array.isArray(char.tags) && char.tags.length > 0
            ? `（${char.tags.join(', ')}）`
            : '';
          return `- **${char.name || '未命名'}** ${tags}：${char.description || char.basePrompt || ''}`;
        })
      );
    }

    lines.push('', '## 分镜示例');

    if (panels.length === 0) {
      lines.push('_暂无分镜数据_');
    } else {
      lines.push(
        ...panels.map(panel => {
          return `- **#${panel.id || '?'} ${panel.type || 'Shot'}**：${panel.prompt || panel.dialogue || '暂无描述'}`;
        })
      );
    }

    lines.push('', '```json', JSON.stringify(result, null, 2), '```');
    return lines.join('\n');
  }, []);

  const analyzeScript = useCallback(async () => {
    const scriptText = script.trim();
    if (!scriptText) {
      toast.warning('请先输入剧本');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStatus('processing');

    try {
      // 获取角色数据（如果有）
      const existingCharacters = (window as any).charactersData || [];
      const deepseekKey = localStorage.getItem('deepseek_api_key') || '';

      const response = await apiRequest<ScriptAnalysisResult>('/script/analyze', {
        method: 'POST',
        body: JSON.stringify({
          script: scriptText,
          characters: existingCharacters,
          provider: modelProvider,
          deepseekKey: modelProvider === 'deepseek' ? (deepseekKey || undefined) : undefined
        })
      });

      if (response.success && response.data) {
        setAnalysisResult(response.data);
        setAnalysisStatus('done');
        
        // 保存到全局变量（供其他模块使用）
        (window as any).storyboardData = response.data;

        // 自动同步角色到角色库
        if (Array.isArray(response.data.characters) && response.data.characters.length > 0) {
          (window as any).charactersData = response.data.characters;
          // 注意：这里可能需要调用角色同步 API，但目前先保存到全局变量
          console.log('[脚本分析] 检测到角色列表，已保存到全局变量:', response.data.characters);
        }

        // 显示成功提示
        const panelCount = response.data.panels?.length || 0;
        console.log(`✅ 分析完成！已生成 ${panelCount} 个分镜。`);
      } else {
        throw new Error(response.error || '分析失败');
      }
    } catch (error: any) {
      console.error('分析失败:', error);
      setAnalysisStatus('error');
      toast.error('分析失败', error.message || '未知错误');
    } finally {
      setIsAnalyzing(false);
    }
  }, [script, modelProvider]);

  const saveToShelf = useCallback(async () => {
    if (!projectTitle.trim()) {
      toast.warning('请先填写项目标题再保存到书架');
      return;
    }

    if (!analysisResult) {
      toast.warning('请先运行"AI 导演分析"', '再保存结果到书架');
      return;
    }

    const panels = analysisResult.panels || [];
    const tags = projectTags
      .split(',')
      .map((tag: string) => tag.trim())
      .filter(Boolean);

    const projectPayload = {
      id: analysisResult.projectId || `proj-${Date.now()}`,
      name: projectTitle.trim(),
      tags: tags.length > 0 ? tags : ['未分类'],
      logline: analysisResult.logline || analysisResult.theme || '暂无简介',
      theme: analysisResult.theme || '',
      updatedAt: new Date().toISOString(),
      generatedPanels: panels.length,
      totalPanels: panels.length,
      availableFeatures: ['analysis', 'storyboard', 'characters', 'image'],
      analysis: {
        ...analysisResult,
        projectId: analysisResult.projectId || `proj-${Date.now()}`
      },
      script: script.trim(),
      stats: {
        scenes: analysisResult.structure?.length || analysisResult.scenes?.length || Math.max(1, Math.round(panels.length / 3)),
        stage: 'Visual Prompter'
      }
    };

    try {
      // 保存到 localStorage（通过全局函数，由 Dashboard hook 读取）
      const shelfKey = 'storyweaver_shelf';
      const shelf = JSON.parse(localStorage.getItem(shelfKey) || '[]');
      const index = shelf.findIndex((p: any) => p.id === projectPayload.id);
      if (index >= 0) {
        shelf[index] = projectPayload;
      } else {
        shelf.unshift(projectPayload);
      }
      localStorage.setItem(shelfKey, JSON.stringify(shelf));
      localStorage.setItem('storyweaver_active_project', projectPayload.id);
      
      // 保存表单数据
      localStorage.setItem('script_project_title', projectTitle.trim());
      localStorage.setItem('script_project_tags', projectTags.trim());
      
      // 保存到全局变量供 Dashboard 使用
      (window as any).storyboardData = projectPayload.analysis;
      
      // 更新 Store 中的当前项目（确保数据同步）
      updateProject(projectPayload.id, {
        ...projectPayload,
        analysis: analysisResult // 确保保存最新的分析结果（包括编辑后的）
      });
      
      toast.success('已保存到书架', '可在概览页切换项目');
    } catch (error) {
      console.error('保存到书架失败:', error);
      toast.error('保存失败', '请稍后再试');
    }
  }, [projectTitle, projectTags, analysisResult, script, updateProject]);

  // 更新分镜
  const updatePanel = useCallback((id: string | number, data: Partial<ScriptAnalysisResult['panels'][0]>) => {
    setAnalysisResult((prev) => {
      if (!prev || !prev.panels) return prev;
      const updatedPanels = prev.panels.map((panel) =>
        String(panel.id) === String(id) ? { ...panel, ...data } : panel
      );
      const updatedResult = { ...prev, panels: updatedPanels };
      
      // 同步更新全局变量
      (window as any).storyboardData = updatedResult;
      
      // 同步更新 Store 中的分镜列表
      setPanels(updatedPanels as any);
      
      // 如果当前项目存在，更新项目中的分析结果
      if (currentProject) {
        updateProject(currentProject.id, {
          analysis: updatedResult
        });
      }
      
      return updatedResult;
    });
  }, [currentProject, updateProject, setPanels]);

  // 删除分镜
  const deletePanel = useCallback((id: string | number) => {
    setAnalysisResult((prev) => {
      if (!prev || !prev.panels) return prev;
      const updatedPanels = prev.panels.filter((panel) => String(panel.id) !== String(id));
      const updatedResult = { ...prev, panels: updatedPanels };
      
      // 同步更新全局变量
      (window as any).storyboardData = updatedResult;
      
      // 同步更新 Store 中的分镜列表
      setPanels(updatedPanels as any);
      
      // 如果当前项目存在，更新项目中的分析结果
      if (currentProject) {
        updateProject(currentProject.id, {
          analysis: updatedResult
        });
      }
      
      return updatedResult;
    });
  }, [currentProject, updateProject, setPanels]);

  // 合并分镜
  const mergePanels = useCallback((ids: (string | number)[]) => {
    if (ids.length < 2) return;
    
    setAnalysisResult((prev) => {
      if (!prev || !prev.panels) return prev;
      
      const panelsToMerge = prev.panels.filter((panel) => ids.includes(panel.id));
      if (panelsToMerge.length < 2) return prev;
      
      // 合并逻辑：将多个分镜的内容合并为一个
      const mergedPanel: ScriptAnalysisResult['panels'][0] = {
        id: panelsToMerge[0].id,
        type: panelsToMerge[0].type,
        prompt: panelsToMerge.map(p => p.prompt).filter(Boolean).join('; '),
        dialogue: panelsToMerge.map(p => p.dialogue).filter(Boolean).join(' '),
        sfx: panelsToMerge.map(p => p.sfx).filter(Boolean).join(', '),
        duration: panelsToMerge.reduce((sum, p) => sum + (p.duration || 3.0), 0)
      };
      
      // 移除被合并的分镜，添加合并后的分镜
      const otherPanels = prev.panels.filter((panel) => !ids.includes(panel.id));
      const updatedPanels = [...otherPanels, mergedPanel].sort((a, b) => {
        const aId = typeof a.id === 'string' ? parseInt(a.id) : a.id;
        const bId = typeof b.id === 'string' ? parseInt(b.id) : b.id;
        return aId - bId;
      });
      
      const updatedResult = { ...prev, panels: updatedPanels };
      
      // 同步更新全局变量
      (window as any).storyboardData = updatedResult;
      
      // 同步更新 Store 中的分镜列表
      setPanels(updatedPanels as any);
      
      // 如果当前项目存在，更新项目中的分析结果
      if (currentProject) {
        updateProject(currentProject.id, {
          analysis: updatedResult
        });
      }
      
      return updatedResult;
    });
    
    toast.success('分镜已合并', `已将 ${ids.length} 个分镜合并为一个`);
  }, [currentProject, updateProject, setPanels]);

  // 拆分分镜
  const splitPanel = useCallback((id: string | number) => {
    setAnalysisResult((prev) => {
      if (!prev || !prev.panels) return prev;
      
      const panelToSplit = prev.panels.find((panel) => String(panel.id) === String(id));
      if (!panelToSplit) return prev;
      
      // 拆分逻辑：将一个分镜拆成两个
      const newId1 = `${panelToSplit.id}-1`;
      const newId2 = `${panelToSplit.id}-2`;
      
      const splitPanels: ScriptAnalysisResult['panels'][0][] = [
        {
          ...panelToSplit,
          id: newId1,
          prompt: panelToSplit.prompt ? panelToSplit.prompt.split(';')[0]?.trim() || panelToSplit.prompt : undefined,
          dialogue: panelToSplit.dialogue ? panelToSplit.dialogue.split('。')[0] + '。' : undefined,
          duration: (panelToSplit.duration || 3.0) / 2
        },
        {
          ...panelToSplit,
          id: newId2,
          prompt: panelToSplit.prompt ? panelToSplit.prompt.split(';')[1]?.trim() || panelToSplit.prompt : undefined,
          dialogue: panelToSplit.dialogue ? panelToSplit.dialogue.split('。').slice(1).join('。') : undefined,
          duration: (panelToSplit.duration || 3.0) / 2
        }
      ];
      
      // 移除原分镜，添加拆分后的分镜
      const otherPanels = prev.panels.filter((panel) => String(panel.id) !== String(id));
      const updatedPanels = [...otherPanels, ...splitPanels].sort((a, b) => {
        const aId = typeof a.id === 'string' ? parseInt(a.id) : a.id;
        const bId = typeof b.id === 'string' ? parseInt(b.id) : b.id;
        return aId - bId;
      });
      
      const updatedResult = { ...prev, panels: updatedPanels };
      
      // 同步更新全局变量
      (window as any).storyboardData = updatedResult;
      
      // 同步更新 Store 中的分镜列表
      setPanels(updatedPanels as any);
      
      // 如果当前项目存在，更新项目中的分析结果
      if (currentProject) {
        updateProject(currentProject.id, {
          analysis: updatedResult
        });
      }
      
      return updatedResult;
    });
    
    toast.success('分镜已拆分', '已将分镜拆分为两个');
  }, [currentProject, updateProject, setPanels]);

  return {
    script,
    setScript,
    projectTitle,
    setProjectTitle,
    projectTags,
    setProjectTags,
    modelProvider,
    setModelProvider,
    analysisResult,
    isAnalyzing,
    analysisStatus,
    analyzeScript,
    saveToShelf,
    formatAnalysisMarkdown,
    updatePanel,
    deletePanel,
    mergePanels,
    splitPanel
  };
}

