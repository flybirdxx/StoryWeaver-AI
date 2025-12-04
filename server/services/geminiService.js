const { GoogleGenerativeAI } = require('@google/generative-ai');
// 注意：@google/genai 的 Client 导入方式可能不同，图像生成改用 REST API

class GeminiService {
  constructor(apiKey = null) {
    // 允许传入 API Key，如果没有则从环境变量读取
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY 未在环境变量中设置，且未提供 API Key');
    }
    
    this.apiKey = key;
    
    // Gemini 3 Pro 用于文本分析和推理
    // 注意：gemini-3-pro-preview 需要使用 v1beta API，所以直接使用 REST API
    // 不使用 SDK 的 getGenerativeModel，因为它在 v1 API 中不支持 gemini-3-pro-preview
    
    // Gemini 3 Pro Image Preview 用于图像生成
    // 使用 REST API 而不是 SDK，因为 gemini-3-pro-image-preview 也需要 v1beta API
    this.imageClient = null; // 不再使用 SDK 客户端
  }

  /**
   * 分析剧本并生成结构化分镜数据
   * @param {string} script - 原始剧本文本
   * @param {Array} characters - 角色库信息
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeScript(script, characters = []) {
    const systemPrompt = this.buildAnalysisPrompt(characters);
    
    const prompt = `${systemPrompt}

请分析以下剧本，并生成结构化的分镜数据：

${script}

请以 JSON 格式返回，包含以下字段：
- theme: 主题
- characters: 出现的角色列表。每个角色必须是一个对象，包含：
  - name: 角色姓名（建议中英文都写，例如 "沈军 (Shen Jun)"）
  - description: 一句话角色设定（身份、性格、状态）
  - tags: 3~6 个标签数组，用于快速提示性格/人设（中文即可）
  - basePrompt: 用于图像生成的【英文】基础提示词，描述角色的外观、服装、表情、气质等（例如 "middle-aged Chinese man, worn-out coat, tired eyes..."）
- plot_structure: 情节结构 (start, conflict, climax, resolution)
- panels: 分镜数组，每个分镜包含：
  - id: 序号
  - type: 镜头类型 (Close-up, Wide Shot, Mid Shot, Action, etc.)
  - prompt: 图像生成提示词
  - dialogue: 对话内容（如果有）
  - sfx: 音效文字（如果有）
  - duration: 建议时长（秒）`;

    try {
      // 使用 REST API 调用 v1beta 端点（因为 gemini-3-pro-preview 只在 v1beta 中可用）
      const fetch = globalThis.fetch || require('node-fetch');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
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

      if (!text) {
        throw new Error('无法从响应中提取文本内容');
      }
      
      // 尝试解析 JSON（可能包含 markdown 代码块）
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      
      return JSON.parse(jsonText.trim());
    } catch (error) {
      console.error('Gemini API 错误:', error);
      throw new Error(`剧本分析失败: ${error.message}`);
    }
  }

  /**
   * 生成图像（电影模式）
   * @param {string} prompt - 图像生成提示词
   * @param {string} style - 艺术风格
   * @param {Object} characterRefs - 角色参考信息
   * @param {Object} options - 生成选项 (aspectRatio, imageSize)
   * @returns {Promise<Object>} 包含 imageUrl 和 metadata 的对象
   */
  async generateImage(prompt, style = 'cel-shading', characterRefs = {}, options = {}) {
    console.log('[GeminiService] 生成图像（电影模式），选项:', {
      aspectRatio: options.aspectRatio,
      imageSize: options.imageSize,
      allOptions: options
    });
    
    const enhancedPrompt = this.buildImagePrompt(prompt, style, characterRefs);
    
    // 直接使用 REST API 调用 v1beta 端点
    return await this.generateImageViaREST(enhancedPrompt, options);
  }

  /**
   * 通过 REST API 生成图像
   */
  async generateImageViaREST(prompt, options = {}) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${this.apiKey}`;
    
    // Node.js 18+ 内置 fetch，否则需要 node-fetch
    const fetch = globalThis.fetch || require('node-fetch');
    
    try {
      const aspectRatio = options.aspectRatio || '16:9';
      const imageSize = options.imageSize || '4K';
      
      // 构建请求体，明确指定这是图像生成任务
      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: imageSize
          }
        }
      };

      console.log('发送图像生成请求:', {
        url: url.replace(this.apiKey, '***'),
        promptLength: prompt.length,
        aspectRatio: aspectRatio,
        imageSize: imageSize,
        fullOptions: options,
        requestBodyConfig: requestBody.generationConfig.imageConfig
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('响应解析失败:', responseText);
        throw new Error(`服务器响应格式错误: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        const errorMsg = data.error?.message || data.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('API 错误响应:', JSON.stringify(data, null, 2));
        const error = new Error(errorMsg);
        error.status = response.status;
        error.code = data.error?.status || data.error?.code || response.status;
        throw error;
      }

      // 打印完整响应以便调试
      console.log('API 响应状态:', response.status);
      console.log('API 响应完整数据:', JSON.stringify(data, null, 2));

      // 尝试多种方式提取图像数据
      let imageData = null;
      let mimeType = 'image/png';

      // 方式1: 标准格式 - candidates[0].content.parts[].inlineData
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const parts = data.candidates[0].content.parts || [];
        const imagePart = parts.find(part => part.inlineData);
        
        if (imagePart && imagePart.inlineData) {
          imageData = imagePart.inlineData.data;
          mimeType = imagePart.inlineData.mimeType || 'image/png';
        }
      }

      // 方式2: 直接包含 image_urls（返回 URL 格式）
      if (!imageData && data.image_urls && Array.isArray(data.image_urls) && data.image_urls.length > 0) {
        const imageUrl = data.image_urls[0];
        console.log('检测到图像 URL，直接返回 URL:', imageUrl);
        return {
          imageUrl: imageUrl, // 直接返回 URL
          mimeType: 'image/png', // URL 格式无法确定 mimeType
          prompt: prompt,
          isUrl: true // 标记为 URL 格式
        };
      }

      // 方式2b: 检查 candidates 中是否有 imageUrl
      if (!imageData && data.candidates && data.candidates[0]) {
        const candidate = data.candidates[0];
        if (candidate.imageUrl) {
          console.log('检测到候选中的图像 URL:', candidate.imageUrl);
          return {
            imageUrl: candidate.imageUrl,
            mimeType: 'image/png',
            prompt: prompt,
            isUrl: true
          };
        }
      }

      // 方式3: 检查是否有其他格式
      if (!imageData && data.images && Array.isArray(data.images) && data.images.length > 0) {
        imageData = data.images[0].data || data.images[0].base64;
        mimeType = data.images[0].mimeType || 'image/png';
      }

      // 方式4: 检查响应中是否有 base64 字符串
      if (!imageData && data.data) {
        imageData = data.data;
      }

      if (imageData) {
        // 确保是 base64 格式
        const base64Data = imageData.startsWith('data:') 
          ? imageData.split(',')[1] 
          : imageData;
        
        const imageUrl = `data:${mimeType};base64,${base64Data}`;
        
        console.log('成功提取图像数据:', {
          mimeType: mimeType,
          dataLength: base64Data.length,
          urlLength: imageUrl.length,
          urlPreview: imageUrl.substring(0, 50) + '...'
        });
        
        return {
          imageUrl: imageUrl,
          mimeType: mimeType,
          prompt: prompt,
          isUrl: false // 明确标记为 base64 格式
        };
      }

      // 如果所有方式都失败，检查是否有文本响应（可能是错误信息）
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const parts = data.candidates[0].content.parts || [];
        const textPart = parts.find(part => part.text);
        if (textPart && textPart.text) {
          const textContent = textPart.text;
          console.error('API 返回了文本而不是图像:', textContent.substring(0, 500));
          
          // 检查是否是安全过滤导致的
          if (textContent.toLowerCase().includes('safety') || 
              textContent.toLowerCase().includes('blocked') ||
              textContent.toLowerCase().includes('policy')) {
            throw new Error(`图像生成被安全策略阻止。请修改提示词以避免敏感内容。`);
          }
          
          // 检查是否是模型误解了任务
          if (textContent.toLowerCase().includes('prompt') || 
              textContent.toLowerCase().includes('suggestion') ||
              textContent.toLowerCase().includes('description')) {
            throw new Error(`API 误解了任务，返回了文本描述而非图像。这可能是因为提示词格式问题。原始提示词: ${prompt.substring(0, 100)}...`);
          }
          
          throw new Error(`API 返回文本响应而非图像: ${textContent.substring(0, 200)}`);
        }
      }

      // 如果所有方式都失败，输出完整响应以便调试
      console.error('无法从响应中提取图像数据。完整响应:', JSON.stringify(data, null, 2));
      throw new Error(`API 响应中未找到图像数据。响应键: ${Object.keys(data).join(', ')}`);
    } catch (error) {
      console.error('REST API 图像生成错误:', error);
      // 保留原始错误信息
      throw error;
    }
  }

  /**
   * 构建分析提示词
   */
  buildAnalysisPrompt(characters) {
    let prompt = `你是一位专业的电影导演和分镜师。你的任务是分析剧本并生成详细的分镜数据。

分析要求：
1. 识别场景、角色、动作和情绪
2. 为每个关键镜头确定合适的镜头类型（特写、中景、全景、动作等）
3. 生成详细的图像生成提示词，包含视觉元素、构图、光影、情绪等
4. 识别对话和音效文字

`;

    if (characters.length > 0) {
      prompt += `\n角色库信息：\n`;
      characters.forEach(char => {
        prompt += `- ${char.name}: ${char.description || char.basePrompt}\n`;
      });
    }

    return prompt;
  }

  /**
   * 构建图像生成提示词（电影模式）
   * @param {string} basePrompt - 基础提示词
   * @param {string} style - 艺术风格
   * @param {Object} characterRefs - 角色参考信息
   */
  buildImagePrompt(basePrompt, style, characterRefs) {
    const stylePrompts = {
      'cel-shading': 'Japanese cel-shaded animation style, clean distinct outlines, vivid deep colors,',
      'noir': 'American comic book noir style, high contrast black and white, strong shadows,',
      'ghibli': 'Studio Ghibli watercolor style, soft lighting, warm tones,',
      'realism': 'Cinematic photography style, realistic rendering, natural lighting,'
    };

    const styleText = stylePrompts[style] || stylePrompts['cel-shading'];
    
    // 电影模式：强调电影感、镜头语言、景深、动态构图
    const modeEnhancement = 'cinematic composition, professional camera work, film-grade lighting, dynamic depth of field,';
    
    // 明确指示这是图像生成任务，避免模型返回文本描述
    // 使用英文提示词，因为 Gemini 图像生成模型对英文提示词理解更好
    let enhancedPrompt = `Generate an image: ${styleText} ${modeEnhancement} ${basePrompt}`;

    // 添加角色一致性提示
    if (Object.keys(characterRefs).length > 0) {
      enhancedPrompt += '. Maintain character consistency:';
      Object.entries(characterRefs).forEach(([name, ref]) => {
        enhancedPrompt += ` ${name}(${ref})`;
      });
    }

    // 在末尾再次强调这是图像生成任务
    enhancedPrompt += '. Generate the image directly, do not return text descriptions or prompts.';

    return enhancedPrompt;
  }
}

// 导出单例和类
// 注意：如果没有环境变量，单例创建会失败，但可以通过传入 API Key 创建新实例
let defaultService = null;
try {
  if (process.env.GEMINI_API_KEY) {
    defaultService = new GeminiService();
  }
} catch (error) {
  console.warn('默认 Gemini 服务初始化失败（可能缺少环境变量）:', error.message);
}

module.exports = defaultService;
module.exports.GeminiService = GeminiService;

