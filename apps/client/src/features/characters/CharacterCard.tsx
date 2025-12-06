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
 * CharacterCard - 角色卡片展示组件（纯展示组件）
 * 
 * 信息层级：
 * 1. 第一视点：角色三视图（视觉核心）
 * 2. 第二视点：角色名称与标签（识别核心）
 * 3. 第三视点：简介与 Prompt（详细信息，可折叠）
 */
export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onDelete,
  onGenerateImage,
  isGeneratingImage,
  generationProgress
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // 动态进度文案
  const getProgressMessage = () => {
    if (generationProgress) {
      return generationProgress.message;
    }
    if (isGeneratingImage) {
      return '正在绘制三视图...';
    }
    return '';
  };

  // 强制标记：这是新版本的组件（紧凑版）
  useEffect(() => {
    console.log('[CharacterCard] ✅ 紧凑版组件已加载 - compact-v6');
    console.log('[CharacterCard] 角色:', character.name, '| 版本标记:', 'compact-v6');
  }, [character.name]);
  
  return (
    <div
      className="bg-white dark:bg-stone-900 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-700 overflow-hidden group hover:border-orange-400 transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      data-character-card="compact"
      data-version="compact-v6"
      data-test="compact-version-loaded"
      title="紧凑版角色卡片 (compact-v6) - 优化尺寸"
    >
      {/* 第一视点：角色三视图容器 - 使用 3:2 比例适配横向三视图 */}
      <div 
        className="relative bg-stone-200 dark:bg-stone-800 overflow-hidden" 
        style={{ 
          aspectRatio: '3:2', 
          minHeight: '120px',
          maxHeight: '150px',
          width: '100%'
        }}
      >
        {/* 占位符或旧图 */}
        {character.imageUrl && !isGeneratingImage ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className={`w-full h-full object-contain bg-white dark:bg-stone-900 transition-opacity duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            crossOrigin={character.imageIsUrl ? 'anonymous' : undefined}
          />
        ) : !isGeneratingImage ? (
          <div className="absolute inset-0 flex items-center justify-center text-stone-400 dark:text-stone-500">
            <div className="text-center">
              <div className="text-lg mb-1">📷</div>
              <div className="text-xs">[Character Ref Image]</div>
            </div>
          </div>
        ) : null}

        {/* 生成中的遮罩层和进度反馈 */}
        {isGeneratingImage && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center transition-opacity duration-300">
            {/* 加载动画 */}
            <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            
            {/* 动态状态文案 */}
            <p className="text-xs font-medium text-white mb-0.5">{getProgressMessage()}</p>
            <p className="text-[10px] text-stone-300 mb-2">生成完整角色参考图（正面/侧面/背面）</p>
            
            {/* 进度条 */}
            <div className="w-32 h-0.5 bg-stone-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-300 animate-pulse" 
                style={{ width: generationProgress?.stage === 'finalizing' ? '100%' : generationProgress?.stage === 'refining' ? '80%' : generationProgress?.stage === 'drawing' ? '50%' : '30%' }}
              ></div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div
          className={`absolute top-2 right-2 flex gap-2 transition-opacity duration-200 ${
            showActions && !isGeneratingImage ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={() => onGenerateImage(character.id)}
            disabled={isGeneratingImage}
            className="p-1 bg-stone-800/90 hover:bg-stone-700 text-white rounded text-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur-sm"
            title="生成参考图"
          >
            {isGeneratingImage ? '生成中...' : '生成参考图'}
          </button>
          <button
            onClick={() => onDelete(character.id)}
            disabled={isGeneratingImage}
            className="p-1 bg-red-500/90 hover:bg-red-600 text-white rounded text-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur-sm"
            title="删除角色"
          >
            删除
          </button>
        </div>
      </div>

      {/* 第二视点：角色名称与标签 */}
      <div className="p-3 border-b border-stone-100 dark:border-stone-800">
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-1.5">
          {character.name}
        </h3>
        <div className="flex gap-2 flex-wrap">
          {(character.tags || []).map((tag, idx) => (
            <span
              key={idx}
              className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 第三视点：详细信息（可折叠） */}
      <div className="p-3">
        {character.description && (
          <div className="mb-2">
            <p className="text-xs text-stone-600 dark:text-stone-300 overflow-hidden text-ellipsis" style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {character.description}
            </p>
          </div>
        )}
        
        {/* 详细信息切换 */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors mb-2"
        >
          {showDetails ? '收起详情' : '展开详情'}
        </button>

        {showDetails && (
          <div className="mt-2 space-y-2 animate-[fadeIn_0.2s_ease-in-out_forwards]">
            {character.basePrompt && (
              <div>
                <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
                  Base Prompt
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-300 font-mono bg-stone-50 dark:bg-stone-900/80 p-2 rounded border border-stone-100 dark:border-stone-700 max-h-32 overflow-y-auto">
                  {character.basePrompt}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
