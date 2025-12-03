import express, { Request, Response } from 'express';
// 使用 @google/genai SDK（新版本，支持 Gemini 3）
// 如果 SDK 不可用，回退到 REST API
let GoogleGenAI: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const genaiModule = require('@google/genai');
  GoogleGenAI = genaiModule.GoogleGenAI || genaiModule.default?.GoogleGenAI;
} catch (e) {
  console.warn('[Settings] @google/genai SDK 未安装，将使用 REST API');
  GoogleGenAI = null;
}

const router = express.Router();

/**
 * POST /api/settings/test-key
 * 测试 API Key 是否有效
 */
router.post('/test-key', async (req: Request, res: Response) => {
  try {
    // 添加调试日志
    console.log('[Settings] 收到测试 API Key 请求');
    console.log('[Settings] 请求体:', JSON.stringify(req.body));
    console.log('[Settings] Content-Type:', req.get('Content-Type'));
    
    const { apiKey } = req.body ?? {};

    if (!apiKey || !String(apiKey).trim()) {
      console.log('[Settings] API Key 验证失败: 缺少或为空');
      return res.status(400).json({
        success: false,
        error: '缺少 API Key',
        message: '请提供 API Key'
      });
    }

    try {
      const trimmedKey = String(apiKey).trim();

      // 优先使用 @google/genai SDK（如果可用）
      // 如果 SDK 不可用或网络问题，会回退到 REST API
      if (GoogleGenAI) {
        try {
          const ai = new GoogleGenAI({ apiKey: trimmedKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: '请回复"测试成功"'
          });

          const text = response.text || '';

          res.json({
            success: true,
            message: 'API Key 验证成功',
            model: 'gemini-3-pro-preview',
            testResponse: text.substring(0, 50),
            method: 'sdk'
          });
          return;
        } catch (sdkError: any) {
          // 如果 SDK 失败（可能是网络问题），尝试 REST API
          console.log('[Settings] SDK 测试失败，尝试 REST API:', sdkError.message);
        }
      }
      
      // 使用 REST API 作为备选方案
      {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${encodeURIComponent(trimmedKey)}`;

        // 创建 AbortController 用于超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: '请回复"测试成功"' }]
              }
            ]
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json() as { error?: { message?: string } };
          throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
          model?: string;
        };

        let text = '';
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const parts = data.candidates[0].content.parts;
          if (parts && parts[0] && parts[0].text) {
            text = parts[0].text;
          }
        }

        res.json({
          success: true,
          message: 'API Key 验证成功',
          model: 'gemini-3-pro-preview',
          testResponse: text.substring(0, 50),
          method: 'rest'
        });
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[Settings] API Key 测试失败:', error);

      let errorMessage = 'API Key 验证失败';
      const msg = String(error?.message || '');
      const errorCode = error?.code || '';
      const errorCause = error?.cause?.message || '';
      
      // 检查是否是网络连接超时错误
      if (errorCode === 'UND_ERR_CONNECT_TIMEOUT' || 
          errorCause.includes('Connect Timeout') ||
          errorCause.includes('timeout')) {
        errorMessage = '连接超时：无法连接到 Gemini API 服务器。\n\n可能的原因：\n1. 网络连接问题\n2. 防火墙阻止了 HTTPS 连接\n3. 需要配置代理才能访问 Google 服务\n4. DNS 解析问题\n\n建议：\n- 检查网络连接\n- 如果在中国大陆，可能需要配置代理\n- 检查防火墙设置';
      } else if (errorCode === 'UND_ERR_CONNECT' || 
                 msg.includes('ECONNREFUSED') ||
                 msg.includes('ENOTFOUND')) {
        errorMessage = '无法连接到 Gemini API 服务器。\n\n请检查：\n1. 网络连接是否正常\n2. 是否能访问 https://generativelanguage.googleapis.com\n3. 防火墙或代理设置';
      } else if (msg.includes('fetch failed') || 
                 msg.includes('network') || 
                 msg.includes('ECONNREFUSED')) {
        errorMessage = '网络连接失败：无法连接到 Gemini API。\n\n请检查网络连接和防火墙设置。';
      } else if (msg.includes('API_KEY_INVALID') || 
                 msg.includes('API Key not found') || 
                 msg.includes('API_KEY_NOT_FOUND')) {
        errorMessage = 'API Key 无效或未找到';
      } else if (msg.includes('API_KEY_EXPIRED')) {
        errorMessage = 'API Key 已过期';
      } else if (msg.includes('PERMISSION_DENIED')) {
        errorMessage = 'API Key 没有访问权限';
      } else if (msg.includes('400') || msg.includes('401') || msg.includes('403')) {
        errorMessage = `API Key 验证失败: ${msg}`;
      } else if (msg) {
        errorMessage = msg;
      }

      res.status(400).json({
        success: false,
        error: errorMessage,
        message: errorMessage,
        details: msg,
        code: errorCode
      });
    }
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('测试 API Key 时发生错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      message: error?.message || 'Unknown error'
    });
  }
});

/**
 * POST /api/settings/save-key
 * 保存 API Key 到服务器（可选，如果需要在服务器端保存）
 */
router.post('/save-key', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body ?? {};

    if (!apiKey || !String(apiKey).trim()) {
      return res.status(400).json({
        success: false,
        error: '缺少 API Key'
      });
    }

    res.json({
      success: true,
      message: 'API Key 已保存（注意：当前为演示模式，实际应加密存储）'
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('保存 API Key 时发生错误:', error);
    res.status(500).json({
      success: false,
      error: '保存失败',
      message: error?.message || 'Unknown error'
    });
  }
});

export default router;


