const DEFAULT_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
// DeepSeek 官方当前公开的模型 ID 为 deepseek-chat / deepseek-reasoner
// 之前临时写的 deepseek-v3.2 并不是合法的模型名称，会导致 "Model Not Exist"
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

/**
 * DeepSeek V3.2 剧本推理服务
 * 参考官方发布说明：https://api-docs.deepseek.com/zh-cn/news/news251201
 */
class DeepseekService {
  constructor(apiKey = null) {
    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new Error('未提供 DeepSeek API Key，请在环境变量 DEEPSEEK_API_KEY 中设置或在请求体中传入 deepseekKey');
    }

    this.apiKey = key;
    this.baseUrl = DEFAULT_BASE_URL.replace(/\/$/, '');
    this.model = DEFAULT_MODEL;
  }

  /**
   * 使用 DeepSeek V3.2 进行剧本推理
   */
  async analyzeScript(script, characters = []) {
    const systemPrompt = this.buildAnalysisPrompt(characters);
    const userPrompt = this.buildUserPrompt(script);

    const fetch = globalThis.fetch || require('node-fetch');
    const url = `${this.baseUrl}/chat/completions`;

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      // 要求 DeepSeek 直接返回 JSON 对象，避免自然语言说明
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 4096
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorPayload = await response.text();
        throw new Error(`DeepSeek API 请求失败: ${response.status} ${response.statusText} - ${errorPayload}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('DeepSeek API 未返回内容');
      }

      return this.parseResponse(content);
    } catch (error) {
      console.error('DeepSeek Service 错误:', error);
      throw error;
    }
  }

  buildAnalysisPrompt(characters) {
    let prompt = `你是影视导演 + 视觉叙事策划师，擅长将剧本拆解为电影分镜。参考 DeepSeek V3.2 的“思考 + 工具”能力，请输出**结构化 JSON 对象**。

输出要求：
- 深入理解主题、角色关系、情绪基调
- 列出剧情结构（start/conflict/climax/resolution）
- 至少生成 8 个分镜，涵盖不同镜头类型
- 每个分镜需包含 type、prompt、dialogue、sfx、duration
- prompt 面向图像模型（Gemini 3 Pro 图像预览版），强调光影/镜头感/构图

`;

    if (characters.length > 0) {
      prompt += '角色库：\n';
      characters.forEach(char => {
        prompt += `- ${char.name}: ${char.description || char.basePrompt || ''}\n`;
      });
    }

    prompt += '\n重要要求：\n- 必须返回一个 JSON 对象，键名固定为 theme、characters、plot_structure、panels、timestamp。\n- panels 不允许为空数组；即使剧本较短，也要根据情节合理补足至少 8 个分镜。\n- 不要输出任何多余的文字说明或解释，只返回 JSON。';
    return prompt;
  }

  buildUserPrompt(script) {
    return `下面是需要分析的完整剧本，请你**只返回一个 JSON 对象**，不要输出任何多余说明文字：

输出 JSON 结构必须严格为：
{
  "theme": "故事整体主题，用一句话概括",
  "characters": [
    {
      "name": "角色姓名",
      "description": "一句话角色设定，身份/性格/外观等",
      "tags": ["标签1", "标签2"],
      "basePrompt": "用于图像生成的角色基础提示词"
    }
  ],
  "plot_structure": {
    "start": "开端/铺垫",
    "conflict": "冲突/矛盾",
    "climax": "高潮",
    "resolution": "结局/收束"
  },
  "panels": [
    {
      "id": 1,
      "type": "镜头类型，例如 Close-up / Mid Shot / Wide Shot / Action",
      "prompt": "用于图像模型的详细画面描述，包含场景、人物、光影、构图、情绪等",
      "dialogue": "该分镜中的关键台词（可为空）",
      "sfx": "拟声词或声音描述（可为空）",
      "duration": 3.0
    }
  ]
}

要求：
- 至少生成 8 个分镜（panels 数组长度 >= 8），覆盖重要情节转折。
- characters 至少包含出场的主要角色，每个角色给出简短描述和 basePrompt。
- 确保返回的内容是合法 JSON，可以直接被 JSON.parse 解析。

待分析剧本如下：
"""
${script}
"""`;
  }

  parseResponse(content) {
    let jsonText = content.trim();

    // 处理可能的 Markdown 代码块
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/i) || jsonText.match(/```\s*([\s\S]*?)```/i);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    try {
      return JSON.parse(jsonText);
    } catch (error) {
      // 尝试从混杂文本中提取最外层 JSON
      const extracted = this.extractJsonBlock(content);
      if (extracted) {
        try {
          return JSON.parse(extracted);
        } catch (innerError) {
          console.error('DeepSeek JSON 解析失败（提取后仍无法解析）:', {
            snippet: extracted.substring(0, 200)
          });
          throw new Error('DeepSeek 响应 JSON 格式异常，请稍后再试。');
        }
      }

      console.error('DeepSeek JSON 解析失败（未找到 JSON 块）:', {
        snippet: content.substring(0, 200)
      });
      throw new Error('DeepSeek 响应无法解析为 JSON，请检查提示词或剧本文本。');
    }
  }

  /**
   * 从包含多余文本的响应中尝试提取最外层 JSON 对象
   */
  extractJsonBlock(text) {
    const start = text.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = start; i < text.length; i++) {
      const char = text[i];

      if (inString) {
        if (escapeNext) {
          escapeNext = false;
        } else if (char === '\\') {
          escapeNext = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }

    return null;
  }
}

module.exports = { DeepseekService };


