import React, { useState, useEffect } from 'react';
import type { Character } from '@storyweaver/shared';

interface CharacterCardProps {
  character: Character;
  onDelete: (id: string) => void;
  onGenerateImage: (id: string) => void;
  isGeneratingImage: boolean;
  generationProgress?: {
    stage: 'preparing' | 'drawing' | 'refining' | 'finalizing';
    message: string;
  };
}

/**
 * CharacterCard - 角色设定卡（优化版）
 * 
 * 优化点：
 * 1. 使用 object-contain 确保三视图完整显示，不被裁切
 * 2. 中性背景色突出角色
 * 3. 图片点击放大预览
 * 4. 信息分层：三视图 > 姓名+标签 > 详细 Prompt（折叠）
 */
export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onDelete,
  onGenerateImage,
  isGeneratingImage,
  generationProgress
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const getProgressMessage = () => {
    return generationProgress?.message || 'AI 正在绘制三视图...';
  };

  // 调试：记录角色数据变化
  useEffect(() => {
    console.log('[CharacterCard] 角色数据更新:', {
      id: character.id,
      name: character.name,
      hasImageUrl: !!character.imageUrl,
      imageUrlLength: character.imageUrl?.length,
      imageIsUrl: character.imageIsUrl
    });
  }, [character.id, character.imageUrl, character.imageIsUrl]);

  return (
    <>
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
        {/* L1: 三视图区域 - 视觉核心 */}
        <div 
          className="relative w-full aspect-[3/2] bg-stone-100 dark:bg-stone-950 cursor-pointer overflow-hidden"
          onClick={() => character.imageUrl && setShowPreview(true)}
        >
          {character.imageUrl ? (
            <img
              src={character.imageUrl}
              alt={character.name}
              className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
              crossOrigin={character.imageIsUrl ? 'anonymous' : undefined}
              onError={(e) => {
                console.error('[CharacterCard] 图像加载失败:', {
                  characterId: character.id,
                  characterName: character.name,
                  imageUrl: character.imageUrl?.substring(0, 100),
                  isUrl: character.imageIsUrl,
                  error: e
                });
                // 如果图像加载失败，清除 imageUrl 以便显示占位符
                // 注意：这里不能直接修改 props，需要通知父组件
              }}
              onLoad={() => {
                console.log('[CharacterCard] 图像加载成功:', character.name);
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 dark:text-stone-600 gap-2">
              <span className="text-4xl opacity-50">👤</span>
              <span className="text-xs font-mono">待生成设定图</span>
            </div>
          )}

          {/* 生成中遮罩 */}
          {isGeneratingImage && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 p-4 text-center">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-medium animate-pulse">{getProgressMessage()}</p>
            </div>
          )}

          {/* 悬浮操作栏 */}
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateImage(character.id);
              }}
              disabled={isGeneratingImage}
              className="bg-white/90 dark:bg-stone-800/90 hover:bg-orange-500 hover:text-white text-stone-600 dark:text-stone-300 text-[10px] px-2 py-1.5 rounded shadow-sm backdrop-blur-md transition-colors disabled:opacity-50"
            >
              🔄 {character.imageUrl ? '重绘' : '生成'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(character.id);
              }}
              className="bg-white/90 dark:bg-stone-800/90 hover:bg-red-500 hover:text-white text-stone-600 dark:text-stone-300 text-[10px] px-2 py-1.5 rounded shadow-sm backdrop-blur-md transition-colors"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* L2: 姓名 + 标签 */}
        <div className="p-3 flex flex-col flex-1">
          <h3 className="font-bold text-stone-800 dark:text-stone-100 truncate text-base mb-1" title={character.name}>
            {character.name}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mb-2" title={character.description}>
            {character.description || "暂无描述"}
          </p>

          {/* 标签行 */}
          <div className="flex flex-wrap gap-1.5 mb-3 min-h-[1.5rem]">
            {(character.tags || []).slice(0, 4).map((tag, idx) => (
              <span 
                key={idx} 
                className="text-[10px] px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded border border-stone-200 dark:border-stone-700 truncate max-w-[80px]"
              >
                {tag}
              </span>
            ))}
            {(character.tags?.length || 0) > 4 && (
              <span className="text-[10px] px-1.5 py-0.5 text-stone-400">+{character.tags!.length - 4}</span>
            )}
          </div>

          {/* L3: 详情展开按钮 */}
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="w-full py-1.5 text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 bg-stone-50 dark:bg-stone-800/50 rounded flex items-center justify-center gap-1 transition-colors mt-auto"
          >
            <span>{showDetails ? '收起 Prompt' : '查看 Prompt'}</span>
            <span className={`transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* Prompt 详情（可展开） */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showDetails ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
            <div className="bg-stone-100 dark:bg-stone-900 p-2 rounded text-[10px] font-mono text-stone-500 dark:text-stone-400 break-words border border-stone-200 dark:border-stone-800">
              {character.basePrompt || '暂无 Prompt'}
            </div>
          </div>
        </div>
      </div>

      {/* 图片预览 Modal */}
      {showPreview && character.imageUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowPreview(false)}
        >
          <img 
            src={character.imageUrl} 
            alt={character.name} 
            className="max-w-full max-h-full object-contain rounded shadow-2xl"
            crossOrigin={character.imageIsUrl ? 'anonymous' : undefined}
          />
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 bg-black/50 rounded-full transition-colors"
            onClick={() => setShowPreview(false)}
          >
            ✕ 关闭
          </button>
        </div>
      )}
    </>
  );
};
