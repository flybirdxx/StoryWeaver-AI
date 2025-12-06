import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-stone-200 dark:bg-stone-800', className)}
      {...props}
    />
  );
};

// 分镜卡片骨架屏
export const PanelCardSkeleton: React.FC = () => {
  return (
    <div className="border rounded-lg p-4 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-20 w-full mb-2" />
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
};

// 角色卡片骨架屏
export const CharacterCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 p-4">
      <Skeleton className="h-32 w-full mb-3 rounded" />
      <Skeleton className="h-5 w-2/3 mb-2" />
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
};

