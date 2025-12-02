const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');

/**
 * POST /api/image/generate
 * 生成分镜图像
 * 
 * 请求体:
 * {
 *   prompt: string,           // 图像生成提示词（必需）
 *   style: string,             // 艺术风格 (cel-shading, noir, ghibli, realism)
 *   characterRefs: object,     // 角色参考信息
 *   aspectRatio: string,       // 宽高比 (16:9, 1:1, 9:16, 4:3, 3:4)
 *   imageSize: string          // 图像尺寸 (1K, 2K, 4K)
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, style, characterRefs, aspectRatio, imageSize, apiKey } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '请提供图像生成提示词'
      });
    }

    // 根据是否提供 apiKey 选择服务实例
    let service = geminiService;
    if (apiKey) {
      const { GeminiService: ServiceClass } = require('../services/geminiService');
      service = new ServiceClass(apiKey);
    }

    // 调用 Gemini 3 Pro Image Preview 生成图像
    const result = await service.generateImage(
      prompt, 
      style || 'cel-shading', 
      characterRefs || {},
      {
        aspectRatio: aspectRatio || '16:9',
        imageSize: imageSize || '4K'
      }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('图像生成错误:', error);
    res.status(500).json({
      error: '生成失败',
      message: error.message
    });
  }
});

/**
 * POST /api/image/generate-batch-stream
 * 批量生成分镜图像（流式返回，实时推送）
 */
router.post('/generate-batch-stream', async (req, res) => {
  console.log('[SSE] 收到流式生成请求');
  
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲

  try {
    const { panels, style, characterRefs, options, apiKey, mode } = req.body;
    
    console.log(`[SSE] 收到流式生成请求，模式: ${mode || '未指定（默认电影模式）'}`);
    console.log(`[SSE] 接收到的选项:`, {
      aspectRatio: options?.aspectRatio,
      imageSize: options?.imageSize,
      fullOptions: options
    });

    if (!panels || !Array.isArray(panels) || panels.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: '请提供分镜数组' })}\n\n`);
      res.end();
      return;
    }

    // 如果提供了 API Key，创建新的服务实例
    let service = geminiService;
    if (apiKey) {
      const { GeminiService: ServiceClass } = require('../services/geminiService');
      service = new ServiceClass(apiKey);
    }

    const results = [];
    const errors = [];
    const batchSize = 3;

    // 发送开始事件
    res.write(`data: ${JSON.stringify({ 
      type: 'start', 
      total: panels.length,
      batchCount: Math.ceil(panels.length / batchSize)
    })}\n\n`);

    // 处理单个分镜的函数
    const processPanel = async (panel) => {
      try {
        const prompt = panel.prompt || panel.description || '';
        if (!prompt) {
          const error = { panelId: panel.id, error: '分镜缺少提示词' };
          errors.push(error);
          res.write(`data: ${JSON.stringify({ type: 'error', data: error })}\n\n`);
          return;
        }

        // 发送开始生成事件
        res.write(`data: ${JSON.stringify({ 
          type: 'generating', 
          panelId: panel.id 
        })}\n\n`);

        console.log(`[路由-流式] 生成分镜 ${panel.id}，模式: ${mode}, aspectRatio: ${options?.aspectRatio || '未指定'}`);
        
        const result = await service.generateImage(
          prompt,
          style || 'cel-shading',
          characterRefs || {},
          options || {},
          mode || 'cinematic'  // 传递模式参数
        );
        
        const resultData = {
          panelId: panel.id,
          ...result
        };
        
        if (!resultData.hasOwnProperty('isUrl')) {
          resultData.isUrl = false;
        }
        
        results.push(resultData);

        // 发送成功事件（包含图像数据）
        res.write(`data: ${JSON.stringify({ 
          type: 'success', 
          data: resultData 
        })}\n\n`);

        console.log(`[流式] 分镜 ${panel.id} 图像生成成功并已推送`);
      } catch (error) {
        console.error(`[流式] 分镜 ${panel.id} 图像生成失败:`, error);
        const errorData = {
          panelId: panel.id,
          error: error.message || '未知错误'
        };
        errors.push(errorData);
        res.write(`data: ${JSON.stringify({ type: 'error', data: errorData })}\n\n`);
      }
    };

    // 将分镜分成批次
    const batches = [];
    for (let i = 0; i < panels.length; i += batchSize) {
      batches.push(panels.slice(i, i + batchSize));
    }
    
    console.log(`[流式] 开始处理 ${panels.length} 个分镜，分成 ${batches.length} 批`);

    // 逐批处理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // 发送批次开始事件
      res.write(`data: ${JSON.stringify({ 
        type: 'batch-start', 
        batchIndex: batchIndex + 1,
        batchTotal: batches.length,
        panelIds: batch.map(p => p.id)
      })}\n\n`);
      
      // 当前批次的所有分镜同时处理（并发）
      const batchPromises = batch.map(panel => processPanel(panel));
      await Promise.all(batchPromises);
      
      // 发送批次完成事件
      res.write(`data: ${JSON.stringify({ 
        type: 'batch-complete', 
        batchIndex: batchIndex + 1,
        batchTotal: batches.length,
        completed: results.length + errors.length,
        total: panels.length
      })}\n\n`);
      
      // 批次之间添加延迟
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 发送完成事件
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      results: results,
      errors: errors,
      total: panels.length,
      success: results.length,
      failed: errors.length
    })}\n\n`);
    
    console.log(`[流式] 所有分镜处理完成！成功: ${results.length}，失败: ${errors.length}`);
    res.end();
  } catch (error) {
    console.error('[流式] 批量图像生成错误:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message || '批量生成失败' 
    })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/image/generate-batch
 * 批量生成分镜图像（使用并发池，限制并发数为3）
 */
router.post('/generate-batch', async (req, res) => {
  try {
    const { panels, style, characterRefs, options, apiKey, mode } = req.body;

    if (!panels || !Array.isArray(panels) || panels.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
        message: '请提供分镜数组'
      });
    }

    // 如果提供了 API Key，创建新的服务实例
    let service = geminiService;
    if (apiKey) {
      const { GeminiService: ServiceClass } = require('../services/geminiService');
      service = new ServiceClass(apiKey);
    }

    const results = [];
    const errors = [];
    
    // 批次处理：每次同时生成 3 张，全部完成后再进行下一批
    const batchSize = 3;
    
    // 处理单个分镜的函数
    const processPanel = async (panel) => {
      try {
        // 确保有提示词
        const prompt = panel.prompt || panel.description || '';
        if (!prompt) {
          errors.push({
            panelId: panel.id,
            error: '分镜缺少提示词'
          });
          return;
        }

        console.log(`[批次] [${mode || 'default'}] 正在生成分镜 ${panel.id} 的图像...`);
        const result = await service.generateImage(
          prompt,
          style || 'cel-shading',
          characterRefs || {},
          options || {},
          mode || 'cinematic'  // 传递模式参数
        );
        
        const resultData = {
          panelId: panel.id,
          ...result
        };
        
        // 确保包含所有必要字段
        if (!resultData.hasOwnProperty('isUrl')) {
          resultData.isUrl = false; // 默认为 base64
        }
        
        results.push(resultData);
        
        console.log(`[批次] 分镜 ${panel.id} 图像生成成功`, {
          panelId: panel.id,
          hasImageUrl: !!result.imageUrl,
          imageUrlLength: result.imageUrl ? result.imageUrl.length : 0,
          isUrl: resultData.isUrl,
          resultKeys: Object.keys(resultData)
        });
      } catch (error) {
        console.error(`[批次] 分镜 ${panel.id} 图像生成失败:`, error);
        errors.push({
          panelId: panel.id,
          error: error.message || '未知错误'
        });
      }
    };

    // 将分镜分成批次，每批 3 个
    const batches = [];
    for (let i = 0; i < panels.length; i += batchSize) {
      batches.push(panels.slice(i, i + batchSize));
    }
    
    console.log(`开始处理 ${panels.length} 个分镜，分成 ${batches.length} 批，每批 ${batchSize} 个`);

    // 逐批处理，每批内部并发
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n[批次 ${batchIndex + 1}/${batches.length}] 开始处理 ${batch.length} 个分镜: ${batch.map(p => p.id).join(', ')}`);
      
      // 当前批次的所有分镜同时处理（并发）
      const batchPromises = batch.map(panel => processPanel(panel));
      await Promise.all(batchPromises);
      
      console.log(`[批次 ${batchIndex + 1}/${batches.length}] 完成，已处理 ${results.length + errors.length}/${panels.length} 个分镜`);
      
      // 批次之间添加延迟，避免 API 限流
      if (batchIndex < batches.length - 1) {
        console.log(`等待 2 秒后处理下一批...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n所有分镜处理完成！成功: ${results.length}，失败: ${errors.length}`);

    // 即使有部分失败，只要有成功的就返回成功状态
    const hasSuccess = results.length > 0;
    
    res.json({
      success: hasSuccess, // 只要有成功的就返回 true
      data: {
        results: results,
        errors: errors,
        total: panels.length,
        success: results.length,
        failed: errors.length
      },
      message: hasSuccess 
        ? `成功生成 ${results.length} 张图像${errors.length > 0 ? `，${errors.length} 张失败` : ''}`
        : '所有图像生成失败'
    });
  } catch (error) {
    console.error('批量图像生成错误:', error);
    res.status(500).json({
      success: false,
      error: '批量生成失败',
      message: error.message
    });
  }
});

module.exports = router;
