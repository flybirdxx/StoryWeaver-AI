const express = require('express');
const router = express.Router();
const analysisService = require('../services/analysisService');

/**
 * POST /api/script/analyze
 * 分析剧本
 */
router.post('/analyze', async (req, res) => {
  try {
    const { script, characters, apiKey, provider, deepseekKey } = req.body;

    if (!script) {
      return res.status(400).json({ 
        error: '缺少必要参数',
        message: '请提供剧本内容'
      });
    }

    // 如果请求中提供了 API Key，使用它；否则使用环境变量中的
    const result = await analysisService.analyzeScript(
      script,
      characters || [],
      apiKey || null,
      {
        provider,
        deepseekKey
      }
    );
    
    // 计算镜头分布
    const distribution = analysisService.getShotDistribution(result.panels);

    res.json({
      success: true,
      data: result,
      statistics: {
        totalPanels: result.panels.length,
        shotDistribution: distribution
      }
    });
  } catch (error) {
    console.error('剧本分析错误:', error);
    res.status(500).json({
      error: '分析失败',
      message: error.message
    });
  }
});

module.exports = router;

