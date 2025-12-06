import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  showPercentage = true
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
            {label}
          </span>
          {showPercentage && (
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {current} / {total} ({percentage}%)
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

// 生成进度指示器（带阶段信息）
interface GenerationProgressProps {
  stage: 'preparing' | 'drawing' | 'refining' | 'finalizing' | 'completed';
  message?: string;
  current?: number;
  total?: number;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  stage,
  message,
  current,
  total
}) => {
  const stageLabels = {
    preparing: '准备中...',
    drawing: '绘制中...',
    refining: '精修中...',
    finalizing: '最终处理...',
    completed: '完成'
  };

  const stageProgress = {
    preparing: 20,
    drawing: 50,
    refining: 75,
    finalizing: 90,
    completed: 100
  };

  const progress = stageProgress[stage];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-600 dark:text-stone-400">
          {stageLabels[stage]}
        </span>
        {current !== undefined && total !== undefined && (
          <span className="text-stone-500 dark:text-stone-500">
            {current} / {total}
          </span>
        )}
      </div>
      <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {message && (
        <p className="text-[10px] text-stone-500 dark:text-stone-400">
          {message}
        </p>
      )}
    </div>
  );
};

