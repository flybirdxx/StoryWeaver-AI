import React, { useEffect, useState } from 'react';
import { useApiQuery } from '../../hooks/useApiQuery';

interface Job {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload?: {
    prompt?: string;
    panelId?: string | number;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface TaskCenterProps {
  maxVisible?: number;
}

export const TaskCenter: React.FC<TaskCenterProps> = ({ maxVisible = 5 }) => {
  const { data: jobs, isLoading } = useApiQuery<Job[]>(
    ['jobs', 'active'],
    '/image/jobs/active',
    {
      refetchInterval: 3000, // 每3秒刷新一次
      staleTime: 1000
    }
  );

  const activeJobs = (jobs || []).slice(0, maxVisible);
  const hasActiveJobs = activeJobs.length > 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-stone-600 dark:text-stone-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'processing':
        return '处理中';
      case 'failed':
        return '失败';
      default:
        return '等待中';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'processing':
        return '⟳';
      case 'failed':
        return '✗';
      default:
        return '○';
    }
  };

  if (isLoading && !hasActiveJobs) {
    return (
      <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800">
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">任务中心</h3>
        <p className="text-sm text-stone-400 dark:text-stone-500">加载中...</p>
      </div>
    );
  }

  if (!hasActiveJobs) {
    return (
      <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800">
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">任务中心</h3>
        <p className="text-sm text-stone-400 dark:text-stone-500">
          暂无后台任务
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800">
      <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">任务中心</h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
        后台任务进度（实时更新）
      </p>
      <div className="space-y-3">
        {activeJobs.map((job) => (
          <div
            key={job.id}
            className="p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-medium ${getStatusColor(job.status)}`}>
                    {getStatusIcon(job.status)} {getStatusLabel(job.status)}
                  </span>
                  {job.status === 'processing' && (
                    <span className="text-xs text-stone-400 dark:text-stone-500 animate-pulse">
                      处理中...
                    </span>
                  )}
                </div>
                {job.payload?.prompt && (
                  <p className="text-xs text-stone-600 dark:text-stone-400 truncate">
                    {job.payload.prompt.substring(0, 50)}
                    {job.payload.prompt.length > 50 ? '...' : ''}
                  </p>
                )}
                {job.error && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    错误: {job.error.substring(0, 50)}
                  </p>
                )}
              </div>
              <div className="text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap">
                {job.status === 'completed' && job.completedAt
                  ? new Date(job.completedAt).toLocaleTimeString()
                  : new Date(job.updatedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {(jobs || []).length > maxVisible && (
          <p className="text-xs text-stone-400 dark:text-stone-500 text-center mt-2">
            还有 {(jobs || []).length - maxVisible} 个任务...
          </p>
        )}
      </div>
    </div>
  );
};

