import React, { useState } from 'react';
import type { Character } from '@storyweaver/shared';

interface CharacterConfirmModalProps {
  characters: Character[];
  isOpen: boolean;
  onConfirm: (selectedCharacters: Character[]) => void;
  onCancel: () => void;
}

export const CharacterConfirmModal: React.FC<CharacterConfirmModalProps> = ({
  characters,
  isOpen,
  onConfirm,
  onCancel
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(characters.map(c => c.id))
  );

  if (!isOpen) return null;

  const toggleCharacter = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    const selected = characters.filter(c => selectedIds.has(c.id));
    onConfirm(selected);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-stone-200 dark:border-stone-700">
        <div className="p-6 border-b border-stone-200 dark:border-stone-700">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">
            角色确认
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            剧本分析发现了以下角色，请选择要保存到角色库的角色
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {characters.length === 0 ? (
            <p className="text-stone-400 dark:text-stone-500 text-center py-8">
              未发现角色
            </p>
          ) : (
            <div className="space-y-3">
              {characters.map((character) => {
                const isSelected = selectedIds.has(character.id);
                return (
                  <div
                    key={character.id}
                    onClick={() => toggleCharacter(character.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                        : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCharacter(character.id)}
                        className="mt-1 w-4 h-4 text-orange-600 border-stone-300 rounded focus:ring-orange-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-stone-800 dark:text-stone-100">
                          {character.name}
                        </div>
                        {character.description && (
                          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                            {character.description}
                          </p>
                        )}
                        {character.tags && character.tags.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {character.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {character.basePrompt && (
                          <p className="text-xs text-stone-500 dark:text-stone-500 mt-2 italic">
                            {character.basePrompt.substring(0, 100)}
                            {character.basePrompt.length > 100 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-stone-200 dark:border-stone-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            确认保存 ({selectedIds.size} 个角色)
          </button>
        </div>
      </div>
    </div>
  );
};

