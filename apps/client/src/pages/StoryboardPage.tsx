import React, { useState, useCallback } from 'react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStoryboard } from '../hooks/useStoryboard';
import { useProjectStore } from '../stores/useProjectStore';
import type { Panel, PanelStatus } from '@storyweaver/shared';

export const StoryboardPage: React.FC = () => {
  const {
    panels,
    selectedPanelId,
    isGenerating,
    generatingPanelId,
    selectPanel,
    generateImages,
    generateBatchImages,
    regenerateSinglePanel
  } = useStoryboard();
  const reorderPanels = useProjectStore((state) => state.reorderPanels);

  const [artStyle, setArtStyle] = useState('realism');
  const [selectedPanelIds, setSelectedPanelIds] = useState<Set<string | number>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid'); // 默认网格视图

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
      const safePanels = Array.isArray(panels) ? panels : [];
      const oldIndex = safePanels.findIndex((p) => String(p.id) === String(active.id));
      const newIndex = safePanels.findIndex((p) => String(p.id) === String(over.id));

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderPanels(oldIndex, newIndex);
      }
    }
  };

  // 确保 panels 是数组，防止白屏
  const safePanels = Array.isArray(panels) ? panels : [];
  const selectedPanel = safePanels.find((p) => p.id === selectedPanelId) || safePanels[0];

  // 处理面板点击（支持 Shift+点击多选）
  const handlePanelClick = useCallback((panelId: string | number, event: React.MouseEvent) => {
    if (event.shiftKey && selectedPanelIds.size > 0) {
      // Shift+点击：多选模式
      setIsMultiSelectMode(true);
      const newSelected = new Set(selectedPanelIds);
      if (newSelected.has(panelId)) {
        newSelected.delete(panelId);
      } else {
        newSelected.add(panelId);
      }
      setSelectedPanelIds(newSelected);
      // 同时选中最后一个点击的面板
      selectPanel(panelId);
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+点击：切换选择
      setIsMultiSelectMode(true);
      const newSelected = new Set(selectedPanelIds);
      if (newSelected.has(panelId)) {
        newSelected.delete(panelId);
      } else {
        newSelected.add(panelId);
      }
      setSelectedPanelIds(newSelected);
      selectPanel(panelId);
    } else {
      // 普通点击：单选
      setIsMultiSelectMode(false);
      setSelectedPanelIds(new Set([panelId]));
      selectPanel(panelId);
    }
  }, [selectedPanelIds, selectPanel]);

  // 清除多选
  const clearSelection = useCallback(() => {
    setSelectedPanelIds(new Set());
    setIsMultiSelectMode(false);
  }, []);

  const handleGenerateImages = async () => {
    await generateImages(artStyle, {
      aspectRatio: '16:9',
      imageSize: '4K'
    });
  };

  // 批量生成选中的分镜
  const handleBatchGenerate = async () => {
    if (selectedPanelIds.size === 0) {
      alert('请先选择要生成的分镜（Shift+点击或 Ctrl+点击）');
      return;
    }
    const selectedPanels = safePanels.filter(p => selectedPanelIds.has(p.id));
    await generateBatchImages(selectedPanels, artStyle, {
      aspectRatio: '16:9',
      imageSize: '4K'
    });
    clearSelection();
  };

  return (
    <section className="space-y-6 h-full flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">故事板画布</h2>
          <p className="text-stone-500 dark:text-stone-400 mt-2">将文字转化为视觉艺术。</p>
        </div>
        
        {/* 视图切换器 */}
        <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md flex items-center gap-2 text-xs font-medium transition-all ${
              viewMode === 'grid' 
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm' 
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            网格概览
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md flex items-center gap-2 text-xs font-medium transition-all ${
              viewMode === 'list' 
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm' 
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            列表精修
          </button>
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
        {isMultiSelectMode && selectedPanelIds.size > 0 && (
          <button
            onClick={clearSelection}
            className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-3 py-1 border border-stone-300 dark:border-stone-700 rounded"
          >
            清除选择 ({selectedPanelIds.size})
          </button>
        )}
        {isMultiSelectMode && selectedPanelIds.size > 0 ? (
          <button
            onClick={handleBatchGenerate}
            disabled={isGenerating}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '生成中...' : `🎥 批量生成选中 (${selectedPanelIds.size} 个)`}
          </button>
        ) : (
          <button
            onClick={handleGenerateImages}
            disabled={isGenerating || safePanels.length === 0}
            className="bg-stone-800 dark:bg-stone-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-black dark:hover:bg-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '生成中...' : '🎥 生成分镜图像 (Gemini 3 Pro)'}
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {safePanels.length === 0 ? (
          <div className="w-full h-64 flex flex-col items-center justify-center text-stone-400 dark:text-stone-500 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
            <p className="text-lg mb-2">暂无分镜数据</p>
            <p className="text-sm">请先在「剧本中心」运行一次 AI 导演分析。</p>
          </div>
        ) : viewMode === 'grid' ? (
          // =================== Grid View (网格视图) ===================
          <div className="h-full overflow-y-auto pr-2 pb-10">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={safePanels.map((p) => String(p.id))}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {safePanels.map((panel) => (
                    <SortablePanelGridCard
                      key={panel.id}
                      panel={panel}
                      isActive={panel.id === selectedPanelId}
                      isSelected={selectedPanelIds.has(panel.id)}
                      isGenerating={generatingPanelId === panel.id}
                      onRegenerate={(panelId) => regenerateSinglePanel(panelId, artStyle, {
                        aspectRatio: '16:9',
                        imageSize: '4K'
                      })}
                      onClick={(e) => handlePanelClick(panel.id, e)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          // =================== List View (列表视图) ===================
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Left: Shot list */}
            <div className="lg:col-span-5 bg-white dark:bg-stone-900 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden transition-colors">
              <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 text-xs text-stone-500 dark:text-stone-400 flex justify-between items-center">
                <span className="font-mono">SHOT LIST</span>
                <span className="text-[11px] text-stone-400 dark:text-stone-500">{safePanels.length} 分镜</span>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={safePanels.map((p) => String(p.id))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
                    {safePanels.map((panel) => (
                      <SortablePanelCard
                        key={panel.id}
                        panel={panel}
                        isActive={panel.id === selectedPanelId}
                        isSelected={selectedPanelIds.has(panel.id)}
                        isGenerating={generatingPanelId === panel.id}
                        onRegenerate={(panelId) => regenerateSinglePanel(panelId, artStyle, {
                          aspectRatio: '16:9',
                          imageSize: '4K'
                        })}
                        onClick={(e) => handlePanelClick(panel.id, e)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Right: Preview & details */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-800 flex-1 min-h-[260px] overflow-hidden transition-colors">
                {!selectedPanel ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 dark:text-stone-500 gap-2">
                    <p className="text-lg">暂无分镜可预览</p>
                    <p className="text-sm">请先在「剧本中心」分析剧本，并在左侧选择一个分镜。</p>
                  </div>
                ) : (
                  <PanelDetail 
                    panel={selectedPanel} 
                    onRegenerate={(panelId) => regenerateSinglePanel(panelId, artStyle, {
                      aspectRatio: '16:9',
                      imageSize: '4K'
                    })}
                    artStyle={artStyle}
                    isGenerating={generatingPanelId === selectedPanel.id}
                  />
                )}
              </div>
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
        )}
      </div>
    </section>
  );
};

interface PanelCardProps {
  panel: Panel;
  isActive: boolean;
  isSelected?: boolean;
  isGenerating?: boolean;
  onRegenerate?: (panelId: string | number) => void;
  onClick: (e: React.MouseEvent) => void;
}

// 可拖拽的分镜卡片组件（列表视图）
const SortablePanelCard: React.FC<PanelCardProps> = ({ panel, isActive, isGenerating, onRegenerate, onClick }) => {
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
        isGenerating={isGenerating}
        onRegenerate={onRegenerate}
        onClick={onClick}
        dragHandleProps={listeners}
      />
    </div>
  );
};

// 可拖拽的分镜卡片组件（网格视图）
const SortablePanelGridCard: React.FC<PanelCardProps> = ({ panel, isActive, isSelected, isGenerating, onRegenerate, onClick }) => {
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
      <PanelGridCard
        panel={panel}
        isActive={isActive}
        isSelected={isSelected}
        isGenerating={isGenerating}
        onRegenerate={onRegenerate}
        onClick={onClick}
        dragHandleProps={listeners}
      />
    </div>
  );
};

const PanelCard: React.FC<PanelCardProps & { dragHandleProps?: any }> = ({ 
  panel, 
  isActive, 
  isSelected = false,
  isGenerating = false,
  onRegenerate,
  onClick,
  dragHandleProps 
}) => {
  const label = `#${String(panel.id).padStart(2, '0')}`;
  const duration = panel.duration || 3.0;
  const title = panel.dialogue || (panel.prompt || '').slice(0, 60) || '未命名镜头';
  
  // 确定面板状态（向后兼容旧状态）
  const getPanelStatus = (): PanelStatus => {
    if (isGenerating || panel.status === 'generating') return 'generating';
    if (panel.status === 'completed' || panel.imageUrl) return 'completed';
    if (panel.status === 'failed') return 'failed';
    if (panel.prompt && panel.prompt.trim().length > 0) return 'prompted';
    return 'draft';
  };
  
  const status = getPanelStatus();
  const statusLabels: Record<PanelStatus, string> = {
    draft: '草稿',
    prompted: '已准备',
    generating: '生成中',
    completed: '已完成',
    failed: '失败'
  };
  
  const statusColors: Record<PanelStatus, string> = {
    draft: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400',
    prompted: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    generating: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 animate-pulse',
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  };

  // 状态边框颜色（用于视觉节奏）
  const statusBorderColors: Record<PanelStatus, string> = {
    draft: 'border-stone-300 dark:border-stone-700',
    prompted: 'border-blue-300 dark:border-blue-700',
    generating: 'border-yellow-500 dark:border-yellow-600',
    completed: 'border-green-500 dark:border-green-600',
    failed: 'border-red-500 dark:border-red-600'
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止触发面板选择
    if (onRegenerate) {
      onRegenerate(panel.id);
    }
  };

  return (
    <div
      className={`group relative flex gap-3 px-3 py-3 cursor-pointer transition-colors select-none ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500'
          : isActive
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
      <div className={`w-16 h-16 rounded-md bg-stone-100 dark:bg-stone-800 overflow-hidden flex-shrink-0 border-2 ${statusBorderColors[status]}`}>
        {panel.imageUrl ? (
          <img
            src={panel.imageUrl}
            alt={`Shot ${panel.id}`}
            className="w-full h-full object-cover"
            crossOrigin={panel.imageIsUrl ? 'anonymous' : undefined}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[10px] text-stone-400 dark:text-stone-500">
            {status === 'generating' ? (
              <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="text-xs opacity-60">{panel.type || 'Wide Shot'}</span>
                <span className="text-[8px] opacity-40">等待生成</span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 gap-1">
          <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500">{label}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
            {panel.type || 'Mid Shot'}
          </span>
          <span className="text-[10px] text-stone-400 dark:text-stone-500">{duration}s</span>
          {status === 'failed' && onRegenerate && (
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="text-[10px] px-1.5 py-0.5 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors disabled:opacity-50"
              title="重新生成"
            >
              🔄
            </button>
          )}
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

// 网格视图卡片组件
const PanelGridCard: React.FC<PanelCardProps & { dragHandleProps?: any }> = ({
  panel, isActive, isSelected, isGenerating, onRegenerate, onClick, dragHandleProps
}) => {
  const label = `#${String(panel.id).padStart(2, '0')}`;
  
  const getPanelStatus = (): PanelStatus => {
    if (isGenerating || panel.status === 'generating') return 'generating';
    if (panel.status === 'completed' || panel.imageUrl) return 'completed';
    if (panel.status === 'failed') return 'failed';
    if (panel.prompt && panel.prompt.trim().length > 0) return 'prompted';
    return 'draft';
  };
  
  const status = getPanelStatus();
  const statusBorderColors: Record<PanelStatus, string> = {
    draft: 'border-stone-300 dark:border-stone-700',
    prompted: 'border-blue-300 dark:border-blue-700',
    generating: 'border-yellow-500 dark:border-yellow-600',
    completed: 'border-green-500 dark:border-green-600',
    failed: 'border-red-500 dark:border-red-600'
  };
  
  return (
    <div 
      onClick={onClick}
      className={`
        relative flex flex-col bg-white dark:bg-stone-900 rounded-lg border-2 shadow-sm overflow-hidden transition-all cursor-pointer
        ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : statusBorderColors[status]}
        ${isActive ? 'ring-2 ring-orange-500' : ''}
        ${isGenerating ? 'opacity-80' : 'hover:shadow-md hover:-translate-y-0.5'}
      `}
    >
      {/* Header: Panel Info */}
      <div className="px-2 py-1.5 flex justify-between items-center bg-stone-50 dark:bg-stone-800 border-b border-stone-100 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-stone-500 dark:text-stone-400">{label}</span>
          <span className="text-[10px] px-1.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
            {panel.type || 'Mid Shot'}
          </span>
        </div>
        {dragHandleProps && (
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500">
            ⠿
          </div>
        )}
      </div>

      {/* Image Area (Large) - 占卡片 70% 高度 */}
      <div className="aspect-video bg-stone-100 dark:bg-stone-950 relative group">
        {panel.imageUrl ? (
          <img 
            src={panel.imageUrl} 
            alt={`Shot ${panel.id}`} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
            crossOrigin={panel.imageIsUrl ? 'anonymous' : undefined} 
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 dark:text-stone-600 gap-2 p-4 text-center">
            {status === 'generating' ? (
              <>
                <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">渲染中...</span>
              </>
            ) : (
              <>
                <span className="text-2xl opacity-20">🎬</span>
                <span className="text-xs opacity-60 font-mono">{panel.type || 'Wide Shot'}</span>
                <span className="text-[10px] opacity-40">等待生成</span>
              </>
            )}
          </div>
        )}
        
        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
          {onRegenerate && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRegenerate(panel.id); }}
              className="bg-white/90 text-stone-800 text-xs px-3 py-1.5 rounded hover:bg-orange-500 hover:text-white transition-colors shadow-sm font-medium"
            >
              🔄 重绘
            </button>
          )}
        </div>
      </div>

      {/* Footer: Dialogue / Prompt Snippet */}
      <div className="p-2.5 flex-1 flex flex-col justify-center min-h-[3rem]">
        <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed" title={panel.dialogue || panel.prompt}>
          {panel.dialogue ? (
            <span className="italic">"{panel.dialogue}"</span>
          ) : (
            <span className="text-stone-400 dark:text-stone-500 text-[10px]">{panel.prompt || '暂无内容'}</span>
          )}
        </p>
      </div>
    </div>
  );
};

interface PanelDetailProps {
  panel: Panel;
  onRegenerate?: (panelId: string | number) => void;
  artStyle?: string;
  isGenerating?: boolean;
}

const PanelDetail: React.FC<PanelDetailProps> = ({ panel, onRegenerate, artStyle = 'cel-shading', isGenerating = false }) => {
  const label = `#${String(panel.id).padStart(2, '0')}`;
  const duration = panel.duration || 3.0;
  
  // 确定面板状态
  const getPanelStatus = (): PanelStatus => {
    if (isGenerating || panel.status === 'generating') return 'generating';
    if (panel.status === 'completed' || panel.imageUrl) return 'completed';
    if (panel.status === 'failed') return 'failed';
    if (panel.prompt && panel.prompt.trim().length > 0) return 'prompted';
    return 'draft';
  };
  
  const status = getPanelStatus();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-stone-950 dark:bg-stone-800 text-xs text-stone-400 dark:text-stone-500 font-mono flex items-center justify-between">
        <span>Shot {label}</span>
        <div className="flex items-center gap-2">
          <span>
            {panel.type || 'Mid Shot'} · {duration}s
          </span>
          {status === 'failed' && onRegenerate && (
            <button
              onClick={() => onRegenerate(panel.id)}
              disabled={isGenerating}
              className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="重新生成图像"
            >
              {isGenerating ? '生成中...' : '🔄 重新生成'}
            </button>
          )}
        </div>
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
