import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScriptStudio } from '../hooks/useScriptStudio';
import { useCharacters } from '../hooks/useCharacters';
import { useDashboard } from '../hooks/useDashboard';
import { CharacterConfirmModal } from '../components/dashboard/CharacterConfirmModal';
import type { Character } from '@storyweaver/shared';

export const ScriptPage: React.FC = () => {
  const navigate = useNavigate();
  const { syncFromAnalysis } = useCharacters();
  const { saveProjectToShelf } = useDashboard();
  const {
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
    saveToShelf: saveToShelfOriginal,
    formatAnalysisMarkdown
  } = useScriptStudio();

  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [detectedCharacters, setDetectedCharacters] = useState<Character[]>([]);

  const handleSaveToShelf = async () => {
    await saveToShelfOriginal();
    // 重新加载 Dashboard 的项目列表
    navigate('/');
  };

  const handleAnalyzeScript = async () => {
    try {
      await analyzeScript();
      // 等待一小段时间确保 analysisResult 已更新
      setTimeout(() => {
        // 从全局变量获取最新的分析结果（因为 analyzeScript 内部会更新）
        const latestResult = (window as any).storyboardData;
        if (latestResult?.characters && latestResult.characters.length > 0) {
          // 转换角色格式并添加 id
          const characters: Character[] = latestResult.characters.map((char: any, index: number) => ({
            id: char.id || `char-${Date.now()}-${index}`,
            name: char.name || '未命名角色',
            description: char.description || '',
            basePrompt: char.basePrompt || '',
            tags: char.tags || [],
            imageUrl: null,
            imageIsUrl: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
          setDetectedCharacters(characters);
          setShowCharacterModal(true);
        }
      }, 500);
    } catch (error) {
      console.error('分析脚本失败:', error);
    }
  };

  const handleConfirmCharacters = async (selectedCharacters: Character[]) => {
    setShowCharacterModal(false);
    if (selectedCharacters.length > 0) {
      await syncFromAnalysis(selectedCharacters);
    }
    setDetectedCharacters([]);
  };

  const handleCancelCharacters = () => {
    setShowCharacterModal(false);
    setDetectedCharacters([]);
  };

  const getStatusColor = () => {
    switch (analysisStatus) {
      case 'processing':
        return 'text-orange-500';
      case 'done':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-stone-500 dark:text-green-400';
    }
  };

  const getStatusText = () => {
    switch (analysisStatus) {
      case 'processing':
        return 'Processing...';
      case 'done':
        return 'Done';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">剧本编辑与分析中心</h2>
          <p className="text-stone-500 dark:text-stone-400 mt-2">输入剧本，让 LLM 导演为您拆解分镜。</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
            导入格式 (.txt/.fountain)
          </button>
          <button
            onClick={handleAnalyzeScript}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span>✨</span> AI 导演分析
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-800 p-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">项目标题</label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              placeholder="例如：赛博朋克：三体前传"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">项目标签 (逗号分隔)</label>
            <input
              type="text"
              value={projectTags}
              onChange={(e) => setProjectTags(e.target.value)}
              className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              placeholder="科幻, 悬疑"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">脚本推理模型</label>
            <select
              value={modelProvider}
              onChange={(e) => setModelProvider(e.target.value as 'gemini' | 'deepseek')}
              className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 focus:ring-2 focus:ring-orange-500 focus:outline-none text-sm text-stone-900 dark:text-stone-100"
            >
              <option value="gemini">Gemini 3 Pro（默认，用于推理+图像）</option>
              <option value="deepseek">DeepSeek V3.2（仅用于脚本推理）</option>
            </select>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">需要在"系统设置"中分别配置对应模型的 API Key。</p>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSaveToShelf}
              className="w-full px-4 py-2 bg-stone-800 dark:bg-stone-700 text-white rounded-lg text-sm hover:bg-black dark:hover:bg-stone-600 transition-colors flex items-center justify-center gap-2"
            >
              <span>📚</span> 保存到书架
            </button>
          </div>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-3">提示：先运行"AI 导演分析"，再填写标题保存，即可在概览页的书架中快速切换项目。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-240px)]">
        {/* Editor */}
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-800 flex flex-col transition-colors">
          <div className="p-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 rounded-t-xl text-xs font-mono text-stone-500 dark:text-stone-300 flex justify-between">
            <span>SOURCE SCRIPT</span>
            <span>Markdown Supported</span>
          </div>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed bg-white dark:bg-stone-950 dark:text-stone-100 transition-colors"
            placeholder="在此输入剧本... 例如：
场景：夜晚，雨中街道。
角色：晃（侦探），撑着黑伞。
动作：晃低头看着地上的证物，神情凝重。突然，一道闪电划过..."
          />
        </div>

        {/* Analysis Output */}
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden transition-colors">
          <div className="p-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs font-mono text-stone-500 dark:text-stone-400 flex justify-between">
            <span>LLM ANALYSIS OUTPUT (JSON)</span>
            <span className={getStatusColor()}>{getStatusText()}</span>
          </div>
          <div className="flex-1 p-6 overflow-y-auto text-stone-600 dark:text-green-400 leading-relaxed bg-white dark:bg-stone-900">
            {isAnalyzing ? (
              <div className="font-mono text-xs">
                // 正在调用 Input Analysis Agent...<br />
                // 正在解析场景与角色...
              </div>
            ) : analysisResult ? (
              <div
                className="text-stone-100 leading-relaxed tracking-wide prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: formatAnalysisMarkdown(analysisResult)
                    .split('\n')
                    .map((line) => {
                      // 简单的 Markdown 渲染（可以后续集成 marked 库）
                      if (line.startsWith('# ')) {
                        return `<h1 class="text-2xl font-bold mb-2">${line.slice(2)}</h1>`;
                      }
                      if (line.startsWith('## ')) {
                        return `<h2 class="text-xl font-bold mt-4 mb-2">${line.slice(3)}</h2>`;
                      }
                      if (line.startsWith('- **')) {
                        return `<li class="mb-1">${line.slice(2)}</li>`;
                      }
                      if (line.startsWith('```')) {
                        return '';
                      }
                      if (line.trim() === '') {
                        return '<br />';
                      }
                      return `<p>${line}</p>`;
                    })
                    .join('')
                }}
              />
            ) : (
              <div className="font-mono text-xs text-stone-500 dark:text-stone-400">
                // 点击"AI 导演分析"生成结构化分镜数据...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Character Confirm Modal */}
      <CharacterConfirmModal
        characters={detectedCharacters}
        isOpen={showCharacterModal}
        onConfirm={handleConfirmCharacters}
        onCancel={handleCancelCharacters}
      />
    </section>
  );
};
