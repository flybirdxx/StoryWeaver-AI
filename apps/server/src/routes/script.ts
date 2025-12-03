import express, { Request, Response } from 'express';
import path from 'path';

// 复用现有 JS 服务逻辑，暂不改写为 TS
// 使用绝对路径，确保编译后也能正确找到模块
// 从 dist/routes/script.js 到项目根目录需要往上 4 层 (routes -> dist -> server -> apps -> root)
const projectRoot = path.join(__dirname, '..', '..', '..', '..');
const serverServicesPath = path.join(projectRoot, 'server', 'services');
const serverUtilsPath = path.join(projectRoot, 'server', 'utils');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const analysisService = require(path.join(serverServicesPath, 'analysisService'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { extractApiKey } = require(path.join(serverUtilsPath, 'apiKey'));

const router = express.Router();

/**
 * POST /api/script/analyze
 * 分析剧本
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { script, characters, provider, deepseekKey } = req.body ?? {};
    const apiKey = extractApiKey(req);

    if (!script) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '请提供剧本内容'
      });
    }

    const result = await analysisService.analyzeScript(
      script,
      characters || [],
      apiKey || null,
      {
        provider,
        deepseekKey
      }
    );

    const distribution = analysisService.getShotDistribution(result.panels);

    res.json({
      success: true,
      data: result,
      statistics: {
        totalPanels: result.panels.length,
        shotDistribution: distribution
      }
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('剧本分析错误:', error);
    res.status(500).json({
      error: '分析失败',
      message: error?.message || 'Unknown error'
    });
  }
});

export default router;


