// Job Processor：处理单个任务的逻辑

import { updateJob, getJobById } from '../db/jobRepo';
import type { JobRow } from '../db/schema';
import type { JobStatus } from '../db/jobRepo';
import path from 'path';

// 使用绝对路径，确保编译后也能正确找到模块
// 从 dist/queue/processor.js 到项目根目录需要往上 4 层 (queue -> dist -> server -> apps -> root)
const projectRoot = path.join(__dirname, '..', '..', '..', '..');
const serverServicesPath = path.join(projectRoot, 'server', 'services');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const geminiService = require(path.join(serverServicesPath, 'geminiService'));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const looksLikeRateLimit = (error: any): boolean => {
  if (!error) return false;
  if (error.status === 429 || error.code === 429) return true;
  const code = (error.code || error.status || '').toString();
  if (code.includes('RESOURCE_EXHAUSTED')) return true;
  return typeof error.message === 'string' && error.message.includes('429');
};

async function generateWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  let attempt = 0;
  let lastError: any;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (!looksLikeRateLimit(error) || attempt === retries - 1) {
        throw error;
      }

      const backoff = Math.pow(2, attempt) * 1000;
      console.warn(
        `[Job Processor] 命中速率限制，${backoff}ms 后重试 (attempt ${attempt + 1}/${retries})`
      );
      await delay(backoff);
      attempt += 1;
    }
  }

  throw lastError;
}

/**
 * 处理图像生成任务
 */
export async function processImageGenerationJob(
  job: JobRow,
  apiKey?: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const payload = JSON.parse(job.payload);
    const { prompt, style, characterRefs, options, apiKey: payloadApiKey } = payload;
    
    // 优先使用 payload 中的 API Key（如果存在）
    const finalApiKey = payloadApiKey || apiKey;

    if (!prompt) {
      await updateJob(job.id, {
        status: 'failed',
        error: '缺少提示词'
      });
      return { success: false, error: '缺少提示词' };
    }

    // 更新状态为处理中
    await updateJob(job.id, { status: 'processing' });

    // 初始化 Gemini Service
    let service = geminiService;
          if (finalApiKey) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { GeminiService: ServiceClass } = require(path.join(serverServicesPath, 'geminiService'));
            service = new ServiceClass(finalApiKey);
          }

    // 生成图像（带重试）
    const result = await generateWithRetry(
      () =>
        service.generateImage(prompt, style || 'cel-shading', characterRefs || {}, options || {}),
      job.maxRetries
    ) as { imageUrl: string; isUrl?: boolean };

    // 更新任务为完成
    await updateJob(job.id, {
      status: 'completed',
      result: {
        imageUrl: result.imageUrl,
        isUrl: result.isUrl || false
      }
    });

    return { success: true, result };
  } catch (error: any) {
    const errorMessage = error?.message || '未知错误';
    const retryCount = job.retryCount + 1;

    // 检查是否应该重试
    if (retryCount < job.maxRetries && looksLikeRateLimit(error)) {
      // 更新重试次数，但保持 pending 状态以便重试
      await updateJob(job.id, {
        retryCount,
        error: `重试中 (${retryCount}/${job.maxRetries}): ${errorMessage}`
      });
      return { success: false, error: `重试中: ${errorMessage}` };
    }

    // 超过重试次数或非速率限制错误，标记为失败
    await updateJob(job.id, {
      status: 'failed',
      error: errorMessage,
      retryCount
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * 处理任务（根据任务类型分发）
 */
export async function processJob(job: JobRow, apiKey?: string): Promise<void> {
  // API Key 可以从参数传入，也可以从 payload 中获取
  try {
    let result;

    switch (job.type) {
      case 'image_generation':
        result = await processImageGenerationJob(job, apiKey);
        break;
      default:
        await updateJob(job.id, {
          status: 'failed',
          error: `未知任务类型: ${job.type}`
        });
        return;
    }

    if (!result.success) {
      console.error(`[Job Processor] 任务 ${job.id} 处理失败:`, result.error);
    } else {
      console.log(`[Job Processor] 任务 ${job.id} 处理成功`);
    }
  } catch (error: any) {
    console.error(`[Job Processor] 任务 ${job.id} 处理异常:`, error);
    await updateJob(job.id, {
      status: 'failed',
      error: error?.message || '处理异常'
    });
  }
}

