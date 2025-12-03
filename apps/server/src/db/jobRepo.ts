// Job Repository：任务队列的数据库操作层

import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from './client';
import { jobs } from './schema';
import type { JobRow } from './schema';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type JobType = 'image_generation' | 'character_image' | 'other';

export interface CreateJobParams {
  id: string;
  type?: JobType;
  priority?: number;
  payload: Record<string, any>;
  maxRetries?: number;
}

export interface UpdateJobParams {
  status?: JobStatus;
  result?: Record<string, any>;
  error?: string;
  retryCount?: number;
}

/**
 * 创建新任务
 */
export async function createJob(params: CreateJobParams): Promise<JobRow> {
  const now = new Date().toISOString();
  const job = {
    id: params.id,
    type: params.type || 'image_generation',
    status: 'pending' as JobStatus,
    priority: params.priority || 0,
    payload: JSON.stringify(params.payload),
    maxRetries: params.maxRetries || 3,
    retryCount: 0,
    createdAt: now,
    updatedAt: now
  };

  await db.insert(jobs).values(job);
  return (await db.select().from(jobs).where(eq(jobs.id, params.id)).limit(1))[0];
}

/**
 * 获取待处理任务（按优先级和创建时间排序）
 */
export async function getPendingJobs(limit = 10): Promise<JobRow[]> {
  return await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, 'pending'))
    .orderBy(desc(jobs.priority), asc(jobs.createdAt))
    .limit(limit);
}

/**
 * 更新任务状态
 */
export async function updateJob(id: string, updates: UpdateJobParams): Promise<JobRow | null> {
  const now = new Date().toISOString();
  const updateData: any = {
    updatedAt: now
  };

  if (updates.status) {
    updateData.status = updates.status;
    if (updates.status === 'processing') {
      updateData.startedAt = now;
    } else if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completedAt = now;
    }
  }

  if (updates.result !== undefined) {
    updateData.result = JSON.stringify(updates.result);
  }

  if (updates.error !== undefined) {
    updateData.error = updates.error;
  }

  if (updates.retryCount !== undefined) {
    updateData.retryCount = updates.retryCount;
  }

  await db.update(jobs).set(updateData).where(eq(jobs.id, id));

  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0] || null;
}

/**
 * 获取任务详情
 */
export async function getJobById(id: string): Promise<JobRow | null> {
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0] || null;
}

/**
 * 获取指定状态的任务列表
 */
export async function getJobsByStatus(status: JobStatus, limit = 100): Promise<JobRow[]> {
  return await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, status))
    .orderBy(desc(jobs.createdAt))
    .limit(limit);
}

/**
 * 清理已完成的任务（保留最近 N 条）
 */
export async function cleanupCompletedJobs(keepRecent = 1000): Promise<number> {
  // 获取要保留的任务 ID
  const keepJobs = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.status, 'completed'))
    .orderBy(desc(jobs.completedAt))
    .limit(keepRecent);

  const keepIds = keepJobs.map((j) => j.id);

  if (keepIds.length === 0) {
    return 0;
  }

  // 删除不在保留列表中的已完成任务
  const result = await db
    .delete(jobs)
    .where(and(eq(jobs.status, 'completed'), ...keepIds.map((id) => eq(jobs.id, id))));

  return result.changes || 0;
}

