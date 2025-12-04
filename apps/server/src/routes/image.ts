import express, { Request, Response } from 'express';
import path from 'path';

// 复用现有 JS 服务逻辑
// 使用绝对路径，确保编译后也能正确找到模块
// 从 dist/routes/image.js 到项目根目录需要往上 4 层 (routes -> dist -> server -> apps -> root)
const projectRoot = path.join(__dirname, '..', '..', '..', '..');
const serverServicesPath = path.join(projectRoot, 'server', 'services');
const serverUtilsPath = path.join(projectRoot, 'server', 'utils');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const geminiService = require(path.join(serverServicesPath, 'geminiService'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { extractApiKey } = require(path.join(serverUtilsPath, 'apiKey'));

const router = express.Router();

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
  retries = Number(process.env.GENERATION_RETRY_LIMIT) || 3
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
      // eslint-disable-next-line no-console
      console.warn(
        `[图像生成] 命中速率限制，${backoff}ms 后重试 (attempt ${attempt + 1}/${retries})`
      );
      await delay(backoff);
      attempt += 1;
    }
  }

  throw lastError;
}

/**
 * POST /api/image/generate
 * 生成分镜图像
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, style, characterRefs, aspectRatio, imageSize } = req.body ?? {};
    const apiKey = extractApiKey(req);

    if (!prompt) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '请提供图像生成提示词'
      });
    }

    let service = geminiService;
          if (apiKey) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { GeminiService: ServiceClass } = require(path.join(serverServicesPath, 'geminiService'));
            service = new ServiceClass(apiKey);
          }

    const result = await generateWithRetry(() =>
      service.generateImage(prompt, style || 'cel-shading', characterRefs || {}, {
        aspectRatio: aspectRatio || '16:9',
        imageSize: imageSize || '4K'
      })
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('图像生成错误:', error);
    res.status(500).json({
      error: '生成失败',
      message: error?.message || 'Unknown error'
    });
  }
});

/**
 * POST /api/image/generate-batch-stream
 * 批量生成分镜图像（流式返回，实时推送）
 */
router.post('/generate-batch-stream', async (req: Request, res: Response) => {
  // eslint-disable-next-line no-console
  console.log('[SSE] 收到流式生成请求（电影模式）');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const { panels, style, characterRefs, options } = req.body ?? {};
    const apiKey = extractApiKey(req);

    // eslint-disable-next-line no-console
    console.log('[SSE] 接收到的选项:', {
      aspectRatio: options?.aspectRatio,
      imageSize: options?.imageSize,
      fullOptions: options
    });

    if (!panels || !Array.isArray(panels) || panels.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: '请提供分镜数组' })}\n\n`);
      res.end();
      return;
    }

    let service = geminiService;
          if (apiKey) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { GeminiService: ServiceClass } = require(path.join(serverServicesPath, 'geminiService'));
            service = new ServiceClass(apiKey);
          }

    const results: any[] = [];
    const errors: any[] = [];
    const batchSize = Math.max(1, Number(process.env.IMAGE_CONCURRENCY) || 3);
    const retryLimit = Number(process.env.GENERATION_RETRY_LIMIT) || 3;

    res.write(
      `data: ${JSON.stringify({
        type: 'start',
        total: panels.length,
        batchCount: Math.ceil(panels.length / batchSize)
      })}\n\n`
    );

    const processPanel = async (panel: any) => {
      try {
        const prompt = panel.prompt || panel.description || '';
        if (!prompt) {
          const error = { panelId: panel.id, error: '分镜缺少提示词' };
          errors.push(error);
          res.write(`data: ${JSON.stringify({ type: 'error', data: error })}\n\n`);
          return;
        }

        res.write(
          `data: ${JSON.stringify({
            type: 'generating',
            panelId: panel.id
          })}\n\n`
        );

        // eslint-disable-next-line no-console
        console.log(
          `[路由-流式] 生成分镜 ${panel.id}，电影模式 aspectRatio: ${
            options?.aspectRatio || '未指定'
          }`
        );

        const result = await generateWithRetry(
          () =>
            service.generateImage(prompt, style || 'cel-shading', characterRefs || {}, options || {}),
          retryLimit
        ) as { imageUrl: string; isUrl?: boolean };

        const resultData: any = {
          panelId: panel.id,
          ...result
        };

        if (!Object.prototype.hasOwnProperty.call(resultData, 'isUrl')) {
          resultData.isUrl = false;
        }

        results.push(resultData);

        res.write(
          `data: ${JSON.stringify({
            type: 'success',
            data: resultData
          })}\n\n`
        );

        // eslint-disable-next-line no-console
        console.log(`[流式] 分镜 ${panel.id} 图像生成成功并已推送`);
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error(`[流式] 分镜 ${panel.id} 图像生成失败:`, error);
        const errorData = {
          panelId: panel.id,
          error: error?.message || '未知错误'
        };
        errors.push(errorData);
        res.write(`data: ${JSON.stringify({ type: 'error', data: errorData })}\n\n`);
      }
    };

    const batches: any[][] = [];
    for (let i = 0; i < panels.length; i += batchSize) {
      batches.push(panels.slice(i, i + batchSize));
    }

    // eslint-disable-next-line no-console
    console.log(`[流式] 开始处理 ${panels.length} 个分镜，分成 ${batches.length} 批`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      res.write(
        `data: ${JSON.stringify({
          type: 'batch-start',
          batchIndex: batchIndex + 1,
          batchTotal: batches.length,
          panelIds: batch.map((p) => p.id)
        })}\n\n`
      );

      const batchPromises = batch.map((panel) => processPanel(panel));
      await Promise.all(batchPromises);

      res.write(
        `data: ${JSON.stringify({
          type: 'batch-complete',
          batchIndex: batchIndex + 1,
          batchTotal: batches.length,
          completed: results.length + errors.length,
          total: panels.length
        })}\n\n`
      );

      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    res.write(
      `data: ${JSON.stringify({
        type: 'complete',
        results,
        errors,
        total: panels.length,
        success: results.length,
        failed: errors.length
      })}\n\n`
    );

    // eslint-disable-next-line no-console
    console.log(`[流式] 所有分镜处理完成！成功: ${results.length}，失败: ${errors.length}`);
    res.end();
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[流式] 批量图像生成错误:', error);
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        message: error?.message || '批量生成失败'
      })}\n\n`
    );
    res.end();
  }
});

/**
 * POST /api/image/generate-batch
 * 批量生成分镜图像（使用并发池，限制并发数为3）
 */
router.post('/generate-batch', async (req: Request, res: Response) => {
  try {
    const { panels, style, characterRefs, options } = req.body ?? {};
    const apiKey = extractApiKey(req);

    if (!panels || !Array.isArray(panels) || panels.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
        message: '请提供分镜数组'
      });
    }

    let service = geminiService;
          if (apiKey) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { GeminiService: ServiceClass } = require(path.join(serverServicesPath, 'geminiService'));
            service = new ServiceClass(apiKey);
          }

    const results: any[] = [];
    const errors: any[] = [];
    const batchSize = Math.max(1, Number(process.env.IMAGE_CONCURRENCY) || 3);
    const retryLimit = Number(process.env.GENERATION_RETRY_LIMIT) || 3;

    const processPanel = async (panel: any) => {
      try {
        const prompt = panel.prompt || panel.description || '';
        if (!prompt) {
          errors.push({
            panelId: panel.id,
            error: '分镜缺少提示词'
          });
          return;
        }

        // eslint-disable-next-line no-console
        console.log(`[批次] 正在生成分镜 ${panel.id} 的图像...`);
        const result = await generateWithRetry(
          () =>
            service.generateImage(
              prompt,
              style || 'cel-shading',
              characterRefs || {},
              options || {}
            ),
          retryLimit
        ) as { imageUrl: string; isUrl?: boolean };

        const resultData: any = {
          panelId: panel.id,
          ...result
        };

        if (!Object.prototype.hasOwnProperty.call(resultData, 'isUrl')) {
          resultData.isUrl = false;
        }

        results.push(resultData);

        // eslint-disable-next-line no-console
        console.log(`[批次] 分镜 ${panel.id} 图像生成成功`, {
          panelId: panel.id,
          hasImageUrl: !!result.imageUrl,
          imageUrlLength: result.imageUrl ? result.imageUrl.length : 0,
          isUrl: resultData.isUrl,
          resultKeys: Object.keys(resultData)
        });
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error(`[批次] 分镜 ${panel.id} 图像生成失败:`, error);
        errors.push({
          panelId: panel.id,
          error: error?.message || '未知错误'
        });
      }
    };

    const batches: any[][] = [];
    for (let i = 0; i < panels.length; i += batchSize) {
      batches.push(panels.slice(i, i + batchSize));
    }

    // eslint-disable-next-line no-console
    console.log(`开始处理 ${panels.length} 个分镜，分成 ${batches.length} 批，每批 ${batchSize} 个`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      // eslint-disable-next-line no-console
      console.log(
        `\n[批次 ${batchIndex + 1}/${batches.length}] 开始处理 ${batch.length} 个分镜: ${batch
          .map((p) => p.id)
          .join(', ')}`
      );

      const batchPromises = batch.map((panel) => processPanel(panel));
      await Promise.all(batchPromises);

      // eslint-disable-next-line no-console
      console.log(
        `[批次 ${batchIndex + 1}/${batches.length}] 完成，已处理 ${
          results.length + errors.length
        }/${panels.length} 个分镜`
      );

      if (batchIndex < batches.length - 1) {
        // eslint-disable-next-line no-console
        console.log(`等待 2 秒后处理下一批...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // eslint-disable-next-line no-console
    console.log(`\n所有分镜处理完成！成功: ${results.length}，失败: ${errors.length}`);

    const hasSuccess = results.length > 0;

    res.json({
      success: hasSuccess,
      data: {
        results,
        errors,
        total: panels.length,
        success: results.length,
        failed: errors.length
      },
      message: hasSuccess
        ? `成功生成 ${results.length} 张图像${
            errors.length > 0 ? `，${errors.length} 张失败` : ''
          }`
        : '所有图像生成失败'
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('批量图像生成错误:', error);
    res.status(500).json({
      success: false,
      error: '批量生成失败',
      message: error?.message || 'Unknown error'
    });
  }
});

/**
 * POST /api/image/generate-queue
 * 将图像生成任务加入队列（立即返回，后台处理）
 */
router.post('/generate-queue', async (req: Request, res: Response) => {
  try {
    const { prompt, style, characterRefs, options, panelId } = req.body ?? {};
    const apiKey = extractApiKey(req);

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
        message: '请提供图像生成提示词'
      });
    }

    // 导入 jobRepo
    const { createJob } = await import('../db/jobRepo');
    const { v4: uuidv4 } = require('uuid');

    // 创建任务
    const jobId = uuidv4();
    await createJob({
      id: jobId,
      type: 'image_generation',
      priority: 0,
      payload: {
        prompt,
        style: style || 'cel-shading',
        characterRefs: characterRefs || {},
        options: options || {},
        panelId,
        apiKey // 将 API Key 存储在 payload 中（注意：实际应用中应该加密存储）
      },
      maxRetries: Number(process.env.GENERATION_RETRY_LIMIT) || 3
    });

    // 立即返回任务 ID
    res.json({
      success: true,
      data: {
        jobId,
        status: 'pending',
        message: '任务已加入队列，正在后台处理'
      }
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('创建队列任务失败:', error);
    res.status(500).json({
      success: false,
      error: '创建任务失败',
      message: error?.message || 'Unknown error'
    });
  }
});

/**
 * GET /api/image/job/:jobId
 * 查询任务状态
 */
router.get('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { getJobById } = await import('../db/jobRepo');

    const job = await getJobById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    const result = job.result ? JSON.parse(job.result) : null;
    const payload = job.payload ? JSON.parse(job.payload) : null;

    res.json({
      success: true,
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
        result,
        error: job.error,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        payload: {
          // 不返回敏感信息（如 API Key）
          prompt: payload?.prompt,
          style: payload?.style,
          panelId: payload?.panelId
        }
      }
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('查询任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '查询失败',
      message: error?.message || 'Unknown error'
    });
  }
});

/**
 * GET /api/image/jobs/active
 * 获取活跃任务列表（pending 和 processing 状态）
 */
router.get('/jobs/active', async (req: Request, res: Response) => {
  try {
    const { getJobsByStatus } = await import('../db/jobRepo');
    
    // 获取 pending 和 processing 状态的任务
    const pendingJobs = await getJobsByStatus('pending', 50);
    const processingJobs = await getJobsByStatus('processing', 50);
    
    // 合并并排序（按创建时间倒序）
    const allJobs = [...pendingJobs, ...processingJobs].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 解析 payload 和 result
    const jobs = allJobs.map((job) => {
      const payload = job.payload ? JSON.parse(job.payload) : null;
      const result = job.result ? JSON.parse(job.result) : null;
      
      return {
        id: job.id,
        type: job.type,
        status: job.status,
        payload: {
          prompt: payload?.prompt,
          panelId: payload?.panelId
        },
        error: job.error,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      };
    });

    res.json({
      success: true,
      data: jobs
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('获取活跃任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: '查询失败',
      message: error?.message || 'Unknown error'
    });
  }
});

/**
 * POST /api/image/generate-batch-queue
 * 批量将图像生成任务加入队列
 */
router.post('/generate-batch-queue', async (req: Request, res: Response) => {
  try {
    const { panels, style, characterRefs, options } = req.body ?? {};
    const apiKey = extractApiKey(req);

    if (!panels || !Array.isArray(panels) || panels.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
        message: '请提供分镜数组'
      });
    }

    // 导入 jobRepo
    const { createJob } = await import('../db/jobRepo');
    const { v4: uuidv4 } = require('uuid');

    const jobIds: string[] = [];

    // 为每个分镜创建任务
    for (const panel of panels) {
      const prompt = panel.prompt || panel.description || '';
      if (!prompt) {
        continue; // 跳过没有提示词的分镜
      }

      const jobId = uuidv4();
      await createJob({
        id: jobId,
        type: 'image_generation',
        priority: 0,
        payload: {
          prompt,
          style: style || 'cel-shading',
          characterRefs: characterRefs || {},
          options: options || {},
          panelId: panel.id,
          apiKey
        },
        maxRetries: Number(process.env.GENERATION_RETRY_LIMIT) || 3
      });

      jobIds.push(jobId);
    }

    res.json({
      success: true,
      data: {
        jobIds,
        total: jobIds.length,
        message: `${jobIds.length} 个任务已加入队列，正在后台处理`
      }
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('批量创建队列任务失败:', error);
    res.status(500).json({
      success: false,
      error: '创建任务失败',
      message: error?.message || 'Unknown error'
    });
  }
});

export default router;


