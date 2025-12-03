import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStoryboard } from '../hooks/useStoryboard';
import { useProjectStore } from '../stores/useProjectStore';
import type { Panel } from '@storyweaver/shared';

export const StoryboardPage: React.FC = () => {
  const {
    panels,
    selectedPanelId,
    isGenerating,
    selectPanel,
    generateImages
  } = useStoryboard();
  const reorderPanels = useProjectStore((state) => state.reorderPanels);

  const [artStyle, setArtStyle] = useState('realism');

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = panels.findIndex((p) => String(p.id) === String(active.id));
      const newIndex = panels.findIndex((p) => String(p.id) === String(over.id));

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderPanels(oldIndex, newIndex);
      }
    }
  };

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) || panels[0];

  const handleGenerateImages = async () => {
    await generateImages(artStyle, {
      aspectRatio: '16:9',
      imageSize: '4K'
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">故事板画布</h2>
          <p className="text-stone-500 dark:text-stone-400 mt-2">将文字转化为视觉艺术。</p>
        </div>
      </header>

      {/* Tool Bar */}
      <div className="bg-white dark:bg-stone-900 p-3 rounded-lg border border-stone-200 dark:border-stone-800 flex flex-wrap gap-4 items-center shadow-sm dark:shadow-black/30 transition-colors">
        <div className="flex items-center gap-2 border-r border-stone-200 dark:border-stone-800 pr-4">
          <span className="text-xs font-bold text-stone-400 dark:text-stone-500">STYLE</span>
          <select
            value={artStyle}
            onChange={(e) => setArtStyle(e.target.value)}
            className="text-sm border-none bg-transparent focus:ring-0 font-medium text-stone-700 dark:text-stone-100"
          >
            <option value="cel-shading">日系赛璐珞 (Cel Shading)</option>
            <option value="noir">美漫黑白线稿 (Noir)</option>
            <option value="ghibli">吉卜力水彩 (Ghibli)</option>
            <option value="realism">电影实拍感 (Realism)</option>
          </select>
        </div>
        <div className="flex items-center gap-2 border-r border-stone-200 dark:border-stone-800 pr-4">
          <span className="text-xs font-bold text-stone-400 dark:text-stone-500">ASSETS</span>
          <button className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded">💬 气泡</button>
          <button className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded">⚡ 速度线</button>
          <button className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded">💥 SFX</button>
        </div>
        <div className="flex-1"></div>
        <button
          onClick={handleGenerateImages}
          disabled={isGenerating || panels.length === 0}
          className="bg-stone-800 dark:bg-stone-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-black dark:hover:bg-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? '生成中...' : '🎥 生成分镜图像 (Gemini 3 Pro)'}
        </button>
      </div>

      {/* Canvas Layout: Left shot list + Right preview / details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-260px)]">
        {/* Left: Shot list */}
        <div className="lg:col-span-5 bg-white dark:bg-stone-900 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden transition-colors">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 text-xs text-stone-500 dark:text-stone-400 flex justify-between items-center">
            <span className="font-mono">SHOT LIST</span>
            <span className="text-[11px] text-stone-400 dark:text-stone-500">{panels.length} 分镜</span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={panels.map((p) => String(p.id))}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
                {panels.length === 0 ? (
                  <div className="w-full text-center py-12 text-stone-400 dark:text-stone-500 text-sm">
                    <p className="text-base mb-2">暂无分镜数据</p>
                    <p>请先在「剧本中心」运行一次 AI 导演分析。</p>
                  </div>
                ) : (
                  panels.map((panel) => (
                    <SortablePanelCard
                      key={panel.id}
                      panel={panel}
                      isActive={panel.id === selectedPanelId}
                      onClick={() => selectPanel(panel.id)}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Right: Preview & details */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Current panel preview */}
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-800 flex-1 min-h-[260px] overflow-hidden transition-colors">
            {!selectedPanel ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 dark:text-stone-500 gap-2">
                <p className="text-lg">暂无分镜可预览</p>
                <p className="text-sm">请先在「剧本中心」分析剧本，并在左侧选择一个分镜。</p>
              </div>
            ) : (
              <PanelDetail panel={selectedPanel} />
            )}
          </div>
          {/* Project rhythm info */}
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-800 p-4 text-xs text-stone-500 dark:text-stone-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-stone-700 dark:text-stone-100 text-sm">项目节奏 & 提示</span>
              <span className="text-[11px] text-stone-400 dark:text-stone-500">来自剧本分析的全局信息</span>
            </div>
            <p>
              左侧选择任意分镜，可以在上方预览区查看大图、对白与提示词。
              未来可以在此区域接入镜头分布图表或节奏分析，让故事画布既美观又信息丰富。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

interface PanelCardProps {
  panel: Panel;
  isActive: boolean;
  onClick: () => void;
}

// 可拖拽的分镜卡片组件
const SortablePanelCard: React.FC<PanelCardProps> = ({ panel, isActive, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(panel.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <PanelCard
        panel={panel}
        isActive={isActive}
        onClick={onClick}
        dragHandleProps={listeners}
      />
    </div>
  );
};

const PanelCard: React.FC<PanelCardProps & { dragHandleProps?: any }> = ({ 
  panel, 
  isActive, 
  onClick,
  dragHandleProps 
}) => {
  const label = `#${String(panel.id).padStart(2, '0')}`;
  const duration = panel.duration || 3.0;
  const title = panel.dialogue || (panel.prompt || '').slice(0, 60) || '未命名镜头';

  return (
    <div
      className={`group relative flex gap-3 px-3 py-3 cursor-pointer transition-colors select-none ${
        isActive
          ? 'bg-orange-50 dark:bg-orange-950/30 border-l-4 border-orange-500'
          : 'hover:bg-stone-50 dark:hover:bg-stone-800/60 border-l-4 border-transparent'
      }`}
      onClick={onClick}
    >
      {/* 拖拽手柄 */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="absolute left-0 top-0 bottom-0 w-1 bg-stone-300 dark:bg-stone-600 hover:bg-stone-400 dark:hover:bg-stone-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="拖拽排序"
        />
      )}
      <div className="w-16 h-16 rounded-md bg-stone-100 dark:bg-stone-800 overflow-hidden flex-shrink-0">
        {panel.imageUrl ? (
          <img
            src={panel.imageUrl}
            alt={`Shot ${panel.id}`}
            className="w-full h-full object-cover"
            crossOrigin={panel.imageIsUrl ? 'anonymous' : undefined}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[10px] text-stone-400 dark:text-stone-500 animate-pulse">
            <span className="w-10 h-2 bg-stone-300 dark:bg-stone-700 rounded-full"></span>
            <span className="w-6 h-2 bg-stone-200 dark:bg-stone-600 rounded-full"></span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500">{label}</span>
          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
            {panel.type || 'Mid Shot'}
          </span>
          <span className="text-[10px] text-stone-400 dark:text-stone-500">{duration}s</span>
        </div>
        <p className="text-xs text-stone-800 dark:text-stone-100 font-medium truncate">{title}</p>
      </div>
      <div className="absolute inset-y-2 -right-2 hidden lg:flex flex-col justify-center gap-1 opacity-0 group-hover:opacity-80 transition-opacity pointer-events-none">
        <span className="w-1 h-4 rounded-full bg-stone-300 dark:bg-stone-600"></span>
        <span className="w-1 h-4 rounded-full bg-stone-300 dark:bg-stone-600"></span>
      </div>
    </div>
  );
};

interface PanelDetailProps {
  panel: Panel;
}

const PanelDetail: React.FC<PanelDetailProps> = ({ panel }) => {
  const label = `#${String(panel.id).padStart(2, '0')}`;
  const duration = panel.duration || 3.0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-stone-950 dark:bg-stone-800 text-xs text-stone-400 dark:text-stone-500 font-mono flex items-center justify-between">
        <span>Shot {label}</span>
        <span>
          {panel.type || 'Mid Shot'} · {duration}s
        </span>
      </div>
      <div className="flex-1 bg-stone-900 dark:bg-stone-950 flex items-center justify-center overflow-hidden">
        {panel.imageUrl ? (
          <img
            src={panel.imageUrl}
            alt={`Shot ${panel.id}`}
            className="w-full h-full object-contain bg-black"
            crossOrigin={panel.imageIsUrl ? 'anonymous' : undefined}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 dark:text-stone-400 text-sm gap-2 animate-pulse">
            <span className="w-1/2 h-4 bg-stone-700 dark:bg-stone-800 rounded-full"></span>
            <span className="w-1/3 h-3 bg-stone-800 dark:bg-stone-700 rounded-full"></span>
            <span className="text-xs opacity-70">生成图像后会在此处展示</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-3 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        {panel.dialogue && (
          <div>
            <div className="text-xs font-semibold text-stone-500 dark:text-stone-300 mb-1">对白 / 旁白</div>
            <p className="text-sm text-stone-800 dark:text-stone-100 leading-relaxed">{panel.dialogue}</p>
          </div>
        )}
        <div>
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-300 mb-1">图像提示词 (Prompt)</div>
          <p className="text-xs text-stone-600 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
            {panel.prompt || '暂无提示词'}
          </p>
        </div>
        {panel.sfx && (
          <div>
            <div className="text-xs font-semibold text-stone-500 dark:text-stone-300 mb-1">音效 / SFX</div>
            <p className="text-xs font-mono text-orange-600 dark:text-orange-400">{panel.sfx}</p>
          </div>
        )}
      </div>
    </div>
  );
};
