const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * POST /api/settings/test-key
 * 测试 API Key 是否有效
 */
router.post('/test-key', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({
        success: false,
        error: '缺少 API Key',
        message: '请提供 API Key'
      });
    }

    try {
      const trimmedKey = apiKey.trim();
      
      // 使用 REST API 直接调用 v1beta 端点（因为 gemini-3-pro-preview 只在 v1beta 中可用）
      const fetch = globalThis.fetch || require('node-fetch');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${trimmedKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: '请回复"测试成功"' }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // 提取响应文本
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
        testResponse: text.substring(0, 50) // 只返回前50个字符
      });
    } catch (error) {
      console.error('API Key 测试失败:', error);
      
      // 解析错误信息
      let errorMessage = 'API Key 验证失败';
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('API Key not found')) {
        errorMessage = 'API Key 无效或未找到';
      } else if (error.message.includes('API_KEY_EXPIRED')) {
        errorMessage = 'API Key 已过期';
      } else if (error.message.includes('PERMISSION_DENIED')) {
        errorMessage = 'API Key 没有访问权限';
      } else {
        errorMessage = error.message || '未知错误';
      }

      res.status(400).json({
        success: false,
        error: errorMessage,
        details: error.message
      });
    }
  } catch (error) {
    console.error('测试 API Key 时发生错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      message: error.message
    });
  }
});

/**
 * POST /api/settings/save-key
 * 保存 API Key 到服务器（可选，如果需要在服务器端保存）
 */
router.post('/save-key', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({
        success: false,
        error: '缺少 API Key'
      });
    }

    // 注意：这里只是示例，实际应用中应该：
    // 1. 加密存储 API Key
    // 2. 关联到用户账户
    // 3. 使用环境变量或安全的密钥管理服务
    
    // 目前只返回成功，实际存储逻辑需要根据需求实现
    res.json({
      success: true,
      message: 'API Key 已保存（注意：当前为演示模式，实际应加密存储）'
    });
  } catch (error) {
    console.error('保存 API Key 时发生错误:', error);
    res.status(500).json({
      success: false,
      error: '保存失败',
      message: error.message
    });
  }
});

module.exports = router;

