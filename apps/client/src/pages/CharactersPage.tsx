import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacters } from '../hooks/useCharacters';
import type { Character } from '@storyweaver/shared';

export const CharactersPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    characters,
    isLoading,
    error,
    createCharacter,
    deleteCharacter,
    generateImage
  } = useCharacters();

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: '',
    basePrompt: ''
  });
  const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);
  
  // 调试：检查状态变化
  useEffect(() => {
    console.log('[CharactersPage] isGeneratingImage 状态变化:', isGeneratingImage);
  }, [isGeneratingImage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

      await createCharacter({
        name: formData.name.trim(),
        description: formData.description.trim(),
        tags,
        basePrompt: formData.basePrompt.trim()
      });

      setShowModal(false);
      setFormData({ name: '', description: '', tags: '', basePrompt: '' });
    } catch (err: any) {
      alert(`创建角色失败: ${err.message}`);
    }
  };

  const handleGenerateImage = async (id: string) => {
    console.log('[CharactersPage] 开始生成图像，角色 ID:', id);
    setIsGeneratingImage(id);
    try {
      await generateImage(id);
      console.log('[CharactersPage] 图像生成成功');
    } catch (error) {
      console.error('[CharactersPage] 图像生成失败:', error);
      throw error; // 重新抛出错误，让调用者处理
    } finally {
      console.log('[CharactersPage] 清除生成状态');
      setIsGeneratingImage(null);
    }
  };

  const handleGoToStoryboard = () => {
    navigate('/storyboard');
  };

  return (
    <section className="space-y-6 relative">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">角色库 (Consistency Core)</h2>
          <p className="text-stone-500 dark:text-stone-400 mt-2">定义角色特征，确保 AI 生成的一致性。</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-stone-800 dark:bg-stone-700 text-white rounded-lg text-sm hover:bg-black dark:hover:bg-stone-600 transition-colors"
        >
          + 新建角色
        </button>
      </header>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-stone-400">
          <p>加载中...</p>
        </div>
      ) : characters.length === 0 ? (
        <div className="col-span-full text-center py-12 text-stone-400 dark:text-stone-500">
          <p className="text-lg mb-2">暂无角色</p>
          <p className="text-sm">点击"新建角色"开始创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              onDelete={deleteCharacter}
              onGenerateImage={handleGenerateImage}
              isGeneratingImage={isGeneratingImage !== null && String(isGeneratingImage) === String(char.id)}
            />
          ))}
        </div>
      )}

      {/* Next step button - Fixed at bottom right */}
      {characters.length > 0 && (
        <button
          onClick={handleGoToStoryboard}
          className="fixed bottom-6 right-6 px-5 py-3 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 shadow-lg transition-colors z-40"
        >
          下一步：生成分镜故事板
        </button>
      )}

      {/* Create Character Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-stone-900 rounded-xl p-6 max-w-md w-full mx-4 border border-stone-200 dark:border-stone-700">
            <h3 className="text-xl font-bold mb-4 text-stone-800 dark:text-stone-100">新建角色</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">角色名称</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">描述</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="侦探, 冷酷"
                  className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">基础提示词</label>
                <textarea
                  rows={3}
                  value={formData.basePrompt}
                  onChange={(e) => setFormData({ ...formData, basePrompt: e.target.value })}
                  placeholder="Silver messy hair, sharp red eyes..."
                  className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ name: '', description: '', tags: '', basePrompt: '' });
                  }}
                  className="px-4 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

interface CharacterCardProps {
  character: Character;
  onDelete: (id: string) => void;
  onGenerateImage: (id: string) => void;
  isGeneratingImage: boolean;
}

const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onDelete,
  onGenerateImage,
  isGeneratingImage
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="bg-white dark:bg-stone-900 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-700 overflow-hidden group hover:border-orange-400 transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="h-64 bg-stone-200 dark:bg-stone-800 relative overflow-hidden">
        {isGeneratingImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 dark:bg-stone-900 z-10">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">正在生成角色三视图...</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">生成完整角色参考图（正面/侧面/背面）</p>
            <div className="mt-4 w-48 h-1 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        ) : character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className="w-full h-full object-contain bg-white dark:bg-stone-900"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-stone-400 dark:text-stone-500">
            <div className="text-center">
              <div className="text-2xl mb-2">📷</div>
              <div className="text-sm">[Character Ref Image]</div>
            </div>
          </div>
        )}
        <div
          className={`absolute top-2 right-2 flex gap-2 transition-opacity ${
            showActions && !isGeneratingImage ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={() => onGenerateImage(character.id)}
            disabled={isGeneratingImage}
            className="p-1 bg-stone-800 text-white rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingImage ? '生成中...' : '生成参考图'}
          </button>
          <button
            onClick={() => onDelete(character.id)}
            disabled={isGeneratingImage}
            className="p-1 bg-red-500 text-white rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            删除
          </button>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">{character.name}</h3>
        <div className="flex gap-2 mt-2 mb-4 flex-wrap">
          {(character.tags || []).map((tag, idx) => (
            <span
              key={idx}
              className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="text-xs text-stone-500 dark:text-stone-300 font-mono bg-stone-50 dark:bg-stone-900/80 p-2 rounded border border-stone-100 dark:border-stone-700 h-20 overflow-y-auto">
          Base Prompt: {character.basePrompt || 'N/A'}
        </div>
      </div>
    </div>
  );
};
