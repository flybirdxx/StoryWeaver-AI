import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../lib/toast';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  onClick: () => void;
}

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: 'script',
      label: '从剧本开始',
      description: '粘贴文本 → AI 分析',
      icon: '📝',
      color: 'orange',
      onClick: () => navigate('/script')
    },
    {
      id: 'concept',
      label: '从概念开始',
      description: '输入一句话 → AI 扩写剧本',
      icon: '💡',
      color: 'blue',
      onClick: () => {
        // TODO: 实现概念扩写功能
        navigate('/script');
      }
    },
    {
      id: 'image',
      label: '从图像开始',
      description: '上传参考图 → 反推 Prompt',
      icon: '🖼️',
      color: 'purple',
      onClick: () => {
        // TODO: 实现图像反推功能
        toast.info('图像反推功能即将推出');
      }
    }
  ];

  return (
    <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800 transition-colors">
      <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">开始新创作</h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
        选择一种方式开始您的创作之旅
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action) => {
          const colorMap = {
            orange: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 hover:border-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/50',
            blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50',
            purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 hover:border-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/50'
          };

          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`p-4 rounded-lg border transition-all text-left ${colorMap[action.color as keyof typeof colorMap]}`}
            >
              <div className="text-2xl mb-2">{action.icon}</div>
              <div className="font-semibold text-stone-800 dark:text-stone-100 mb-1">
                {action.label}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                {action.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

