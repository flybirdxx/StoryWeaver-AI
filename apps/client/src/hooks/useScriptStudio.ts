import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from '../lib/api';

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
}

export function useScriptStudio(): UseScriptStudioReturn {
  const [script, setScript] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectTags, setProjectTags] = useState('');
  const [modelProvider, setModelProvider] = useState<'gemini' | 'deepseek'>('gemini');
  const [analysisResult, setAnalysisResult] = useState<ScriptAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<'ready' | 'processing' | 'done' | 'error'>('ready');

  // 从 localStorage 加载保存的值
  useEffect(() => {
    const savedTitle = localStorage.getItem('script_project_title');
    const savedTags = localStorage.getItem('script_project_tags');
    const savedModel = localStorage.getItem('script_model_provider');
    
    if (savedTitle) setProjectTitle(savedTitle);
    if (savedTags) setProjectTags(savedTags);
    if (savedModel === 'deepseek' || savedModel === 'gemini') {
      setModelProvider(savedModel);
    }
  }, []);

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
      alert('请先输入剧本');
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
      alert(`分析失败: ${error.message || '未知错误'}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [script, modelProvider]);

  const saveToShelf = useCallback(async () => {
    if (!projectTitle.trim()) {
      alert('请先填写项目标题再保存到书架。');
      return;
    }

    if (!analysisResult) {
      alert('请先运行"AI 导演分析"，再保存结果到书架。');
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
      
      alert('✅ 已保存到书架，可在概览页切换项目。');
    } catch (error) {
      console.error('保存到书架失败:', error);
      alert('保存失败，请稍后再试。');
    }
  }, [projectTitle, projectTags, analysisResult, script]);

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
    formatAnalysisMarkdown
  };
}

