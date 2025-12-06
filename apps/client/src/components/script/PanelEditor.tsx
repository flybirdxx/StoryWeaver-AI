import React, { useState } from 'react';
import { Edit2, Trash2, Merge, Split, Save, X } from 'lucide-react';
import { MentionInput } from './MentionInput';
import { useCharacters } from '../../hooks/useCharacters';
import type { Panel } from '@storyweaver/shared';

interface PanelEditorProps {
  panels: Panel[];
  onUpdatePanel: (id: string | number, data: Partial<Panel>) => void;
  onDeletePanel: (id: string | number) => void;
  onMergePanels: (ids: (string | number)[]) => void;
  onSplitPanel: (id: string | number) => void;
}

export const PanelEditor: React.FC<PanelEditorProps> = ({
  panels,
  onUpdatePanel,
  onDeletePanel,
  onMergePanels,
  onSplitPanel
}) => {
  const { characters } = useCharacters();
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [editData, setEditData] = useState<Partial<Panel>>({});

  const handleEdit = (panel: Panel) => {
    setEditingId(panel.id);
    setEditData({
      type: panel.type,
      prompt: panel.prompt,
      dialogue: panel.dialogue,
      sfx: panel.sfx,
      duration: panel.duration
    });
  };

  const handleSave = (id: string | number) => {
    onUpdatePanel(id, editData);
    setEditingId(null);
    setEditData({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleToggleSelect = (id: string | number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleMerge = () => {
    if (selectedIds.size >= 2) {
      onMergePanels(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const getPanelTypeLabel = (type?: string) => {
    if (!type) return '中景';
    const typeMap: Record<string, string> = {
      'Close-up': '特写',
      'Mid Shot': '中景',
      'Wide Shot': '全景',
      'Action': '动作',
      'Action / Mid Shot': '动作 / 中景',
      'Action / Close-up': '动作 / 特写',
      'Action / Wide Shot': '动作 / 全景',
    };
    if (/[\u4e00-\u9fa5]/.test(type)) return type;
    return typeMap[type] || type;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {panels.length === 0 ? (
        <div className="text-center text-stone-400 dark:text-stone-500 py-8">
          <p>暂无分镜数据</p>
        </div>
      ) : (
        <>
          {selectedIds.size >= 2 && (
            <div className="sticky top-0 z-10 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-orange-800 dark:text-orange-200">
                已选择 {selectedIds.size} 个分镜
              </span>
              <button
                onClick={handleMerge}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors"
              >
                <Merge className="w-3 h-3" />
                合并选中
              </button>
            </div>
          )}
          {panels.map((panel) => {
            const isEditing = editingId === panel.id;
            const isSelected = selectedIds.has(panel.id);

            return (
              <div
                key={panel.id}
                className={`border rounded-lg p-4 transition-all ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(panel.id)}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                      #{String(panel.id).padStart(2, '0')}
                    </span>
                    {!isEditing && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                        {getPanelTypeLabel(panel.type)}
                      </span>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(panel)}
                        className="p-1.5 text-stone-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSplitPanel(panel.id)}
                        className="p-1.5 text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="拆分"
                      >
                        <Split className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeletePanel(panel.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                        镜头类型
                      </label>
                      <select
                        value={editData.type || ''}
                        onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                        className="w-full p-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-800"
                      >
                        <option value="Close-up">特写</option>
                        <option value="Mid Shot">中景</option>
                        <option value="Wide Shot">全景</option>
                        <option value="Action">动作</option>
                        <option value="Action / Mid Shot">动作 / 中景</option>
                        <option value="Action / Close-up">动作 / 特写</option>
                        <option value="Action / Wide Shot">动作 / 全景</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                        对白 / 旁白
                      </label>
                      <textarea
                        value={editData.dialogue || ''}
                        onChange={(e) => setEditData({ ...editData, dialogue: e.target.value })}
                        className="w-full p-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-800 resize-none"
                        rows={2}
                        placeholder="输入对白或旁白..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                        图像提示词
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-2">
                          (输入 @ 可快速插入角色)
                        </span>
                      </label>
                      <MentionInput
                        value={editData.prompt || ''}
                        onChange={(value) => setEditData({ ...editData, prompt: value })}
                        placeholder="输入图像生成提示词... 输入 @ 可快速插入角色"
                        rows={4}
                        characters={characters}
                        className="resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                        音效 / SFX
                      </label>
                      <input
                        type="text"
                        value={editData.sfx || ''}
                        onChange={(e) => setEditData({ ...editData, sfx: e.target.value })}
                        className="w-full p-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-800"
                        placeholder="例如：脚步声、雷声..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(panel.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors"
                      >
                        <Save className="w-3 h-3" />
                        保存
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-1 px-3 py-1.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded text-xs hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {panel.dialogue && (
                      <div>
                        <span className="text-xs text-stone-500 dark:text-stone-400">对白：</span>
                        <p className="text-stone-800 dark:text-stone-100 italic">"{panel.dialogue}"</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-stone-500 dark:text-stone-400">提示词：</span>
                      <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 font-mono">
                        {panel.prompt || '暂无提示词'}
                      </p>
                    </div>
                    {panel.sfx && (
                      <div>
                        <span className="text-xs text-stone-500 dark:text-stone-400">音效：</span>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-mono">{panel.sfx}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

