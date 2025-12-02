const { GeminiService } = require('./geminiService');
const { DeepseekService } = require('./deepseekService');

class AnalysisService {
  /**
   * 处理剧本分析请求
   */
  async analyzeScript(script, characters = [], apiKey = null, options = {}) {
    if (!script || !script.trim()) {
      throw new Error('剧本内容不能为空');
    }

    // 明确由前端选择模型；未指定时默认使用 Gemini
    const provider = options.provider || 'gemini';

    try {
      let result;

      if (provider === 'deepseek') {
        const key = options.deepseekKey || process.env.DEEPSEEK_API_KEY;
        const service = new DeepseekService(key);
        result = await service.analyzeScript(script, characters);
      } else {
        // 如果提供了 API Key，创建新的服务实例；否则使用默认实例
        let service;
        if (apiKey) {
          const { GeminiService: ServiceClass } = require('./geminiService');
          service = new ServiceClass(apiKey);
        } else {
          const defaultService = require('./geminiService');
          if (!defaultService) {
            throw new Error('未提供 Gemini API Key，且环境变量 GEMINI_API_KEY 未设置');
          }
          service = defaultService;
        }
        
        result = await service.analyzeScript(script, characters);
      }
      
      // 验证和规范化结果
      return this.normalizeAnalysisResult(result);
    } catch (error) {
      console.error('分析服务错误:', error);
      throw error;
    }
  }

  /**
   * 规范化分析结果
   */
  normalizeAnalysisResult(result) {
    // 确保必要字段存在
    if (!result.panels || !Array.isArray(result.panels)) {
      result.panels = [];
    }

    // 为每个分镜添加默认值
    result.panels = result.panels.map((panel, index) => ({
      id: panel.id || index + 1,
      type: panel.type || 'Mid Shot',
      prompt: panel.prompt || '',
      dialogue: panel.dialogue || null,
      sfx: panel.sfx || null,
      duration: panel.duration || 3.0,
      ...panel
    }));

    return {
      theme: result.theme || 'Unknown',
      characters: result.characters || [],
      plot_structure: result.plot_structure || {},
      panels: result.panels,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 统计镜头类型分布
   */
  getShotDistribution(panels) {
    const distribution = {
      'Close-up': 0,
      'Mid Shot': 0,
      'Wide Shot': 0,
      'Action': 0,
      'Other': 0
    };

    panels.forEach(panel => {
      const type = panel.type || 'Other';
      if (distribution.hasOwnProperty(type)) {
        distribution[type]++;
      } else {
        distribution['Other']++;
      }
    });

    return distribution;
  }
}

module.exports = new AnalysisService();

