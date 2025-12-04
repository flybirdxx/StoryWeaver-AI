import React from 'react';
import { useCharacters } from '../../hooks/useCharacters';
import type { Project } from '@storyweaver/shared';

interface ProjectCharactersProps {
  project: Project | null;
  maxVisible?: number;
}

export const ProjectCharacters: React.FC<ProjectCharactersProps> = ({ 
  project, 
  maxVisible = 5 
}) => {
  const { characters } = useCharacters();
  
  // 从项目分析结果中获取角色名称
  const projectCharacterNames = React.useMemo(() => {
    if (!project?.analysis?.characters) return [];
    return project.analysis.characters
      .map((char: any) => char.name || char)
      .filter(Boolean);
  }, [project]);

  // 从角色库中匹配角色
  const matchedCharacters = React.useMemo(() => {
    if (projectCharacterNames.length === 0) return [];
    
    return characters
      .filter(char => projectCharacterNames.includes(char.name))
      .slice(0, maxVisible);
  }, [characters, projectCharacterNames, maxVisible]);

  if (projectCharacterNames.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="text-xs text-stone-500 dark:text-stone-400 mb-2">主要角色</div>
      <div className="flex gap-2 flex-wrap items-center">
        {matchedCharacters.map((character) => (
          <div
            key={character.id}
            className="flex items-center gap-2 px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded-lg"
            title={character.name}
          >
            {character.imageUrl ? (
              <img
                src={character.imageUrl}
                alt={character.name}
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  // 如果图片加载失败，显示占位符
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-semibold">${character.name.charAt(0)}</div>`;
                  }
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-semibold">
                {character.name.charAt(0)}
              </div>
            )}
            <span className="text-xs text-stone-700 dark:text-stone-300 truncate max-w-[80px]">
              {character.name}
            </span>
          </div>
        ))}
        {projectCharacterNames.length > matchedCharacters.length && (
          <span className="text-xs text-stone-400 dark:text-stone-500">
            +{projectCharacterNames.length - matchedCharacters.length}
          </span>
        )}
      </div>
    </div>
  );
};

