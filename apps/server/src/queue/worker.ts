// Job Worker：后台任务处理 Worker

import { getPendingJobs, getJobById } from '../db/jobRepo';
import type { JobRow } from '../db/schema';
import { processJob } from './processor';

const POLL_INTERVAL = 2000; // 2 秒轮询一次
const BATCH_SIZE = 5; // 每次处理的任务数
const MAX_CONCURRENT = 3; // 最大并发数

let isRunning = false;
let workerInterval: NodeJS.Timeout | null = null;
const processingJobs = new Set<string>();

/**
 * 启动 Worker
 */
export function startWorker(): void {
  if (isRunning) {
    console.warn('[Job Worker] Worker 已在运行中');
    return;
  }

  isRunning = true;
  console.log('[Job Worker] 启动后台任务处理 Worker');

  workerInterval = setInterval(async () => {
    await processBatch();
  }, POLL_INTERVAL);

  // 立即执行一次
  processBatch();
}

/**
 * 停止 Worker
 */
export function stopWorker(): void {
  if (!isRunning) {
    return;
  }

  isRunning = false;
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }

  console.log('[Job Worker] Worker 已停止');
}

/**
 * 处理一批任务
 */
async function processBatch(): Promise<void> {
  if (processingJobs.size >= MAX_CONCURRENT) {
    return; // 已达到最大并发数
  }

  try {
    const pendingJobs = await getPendingJobs(BATCH_SIZE);

    for (const job of pendingJobs) {
      // 跳过正在处理的任务
      if (processingJobs.has(job.id)) {
        continue;
      }

      // 检查并发限制
      if (processingJobs.size >= MAX_CONCURRENT) {
        break;
      }

      // 标记为处理中
      processingJobs.add(job.id);

      // 异步处理任务（不阻塞）
      processJobAsync(job)
        .catch((err) => {
          console.error(`[Job Worker] 任务 ${job.id} 处理异常:`, err);
        })
        .finally(() => {
          processingJobs.delete(job.id);
        });
    }
  } catch (error) {
    console.error('[Job Worker] 处理批次失败:', error);
  }
}

/**
 * 异步处理单个任务
 */
async function processJobAsync(job: JobRow): Promise<void> {
  try {
    // 重新获取任务（确保状态最新）
    const freshJob = await getJobById(job.id);
    if (!freshJob || freshJob.status !== 'pending') {
      return; // 任务已被其他 Worker 处理或已取消
    }

    // 从环境变量或请求中获取 API Key（这里简化处理，实际可以从任务 payload 中获取）
    const apiKey = process.env.GEMINI_API_KEY || '';

    await processJob(freshJob, apiKey);
  } catch (error) {
    console.error(`[Job Worker] 处理任务 ${job.id} 失败:`, error);
  }
}

/**
 * 获取 Worker 状态
 */
export function getWorkerStatus(): {
  isRunning: boolean;
  processingCount: number;
  processingJobIds: string[];
} {
  return {
    isRunning,
    processingCount: processingJobs.size,
    processingJobIds: Array.from(processingJobs)
  };
}

