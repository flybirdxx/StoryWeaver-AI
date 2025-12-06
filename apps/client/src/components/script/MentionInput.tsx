import React, { useState, useRef, useEffect } from 'react';
import type { Character } from '@storyweaver/shared';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  characters: Character[];
  className?: string;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  placeholder,
  rows = 4,
  characters,
  className = ''
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  // 过滤匹配的角色
  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    
    // 检查是否输入了 @
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // 检查 @ 后面是否有空格或换行（如果有，说明 @ 已经结束）
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        setShowMentions(false);
        return;
      }
      
      // 获取 @ 后面的查询文本
      const query = textAfterAt;
      setMentionQuery(query);
      
      // 计算下拉菜单位置
      const textarea = e.target;
      const textBeforeAt = textBeforeCursor.substring(0, lastAtIndex);
      const lines = textBeforeAt.split('\n');
      const lineHeight = 20; // 估算行高
      const charWidth = 8; // 估算字符宽度
      const lineNumber = lines.length - 1;
      const charsInLastLine = lines[lines.length - 1].length;
      
      const top = lineNumber * lineHeight + 25;
      const left = charsInLastLine * charWidth;
      
      setMentionPosition({ top, left });
      setShowMentions(true);
      setSelectedMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  // 插入角色提及
  const insertMention = (character: Character) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;
    
    // 构建插入文本：@角色名 (basePrompt)
    const mentionText = character.basePrompt 
      ? `@${character.name} (${character.basePrompt})`
      : `@${character.name}`;
    
    // 替换 @ 到光标位置的内容
    const newValue = 
      value.substring(0, lastAtIndex) + 
      mentionText + 
      ' ' + 
      value.substring(cursorPos);
    
    onChange(newValue);
    setShowMentions(false);
    
    // 设置光标位置到插入文本之后
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + mentionText.length + 1;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredCharacters.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredCharacters.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredCharacters[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mentionListRef.current &&
        !mentionListRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowMentions(false);
      }
    };

    if (showMentions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMentions]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={`w-full p-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-800 resize-none font-mono ${className}`}
      />
      
      {showMentions && filteredCharacters.length > 0 && (
        <div
          ref={mentionListRef}
          className="absolute z-50 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{
            top: `${mentionPosition.top}px`,
            left: `${mentionPosition.left}px`,
            minWidth: '200px'
          }}
        >
          {filteredCharacters.map((character, index) => (
            <button
              key={character.id}
              type="button"
              onClick={() => insertMention(character)}
              className={`w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors ${
                index === selectedMentionIndex
                  ? 'bg-orange-50 dark:bg-orange-950/30 border-l-2 border-orange-500'
                  : ''
              }`}
            >
              <div className="font-semibold text-sm text-stone-800 dark:text-stone-100">
                {character.name}
              </div>
              {character.basePrompt && (
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                  {character.basePrompt.substring(0, 60)}
                  {character.basePrompt.length > 60 ? '...' : ''}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      
      {showMentions && filteredCharacters.length === 0 && (
        <div
          className="absolute z-50 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg shadow-lg p-3"
          style={{
            top: `${mentionPosition.top}px`,
            left: `${mentionPosition.left}px`
          }}
        >
          <p className="text-xs text-stone-500 dark:text-stone-400">
            未找到匹配的角色
          </p>
        </div>
      )}
    </div>
  );
};

