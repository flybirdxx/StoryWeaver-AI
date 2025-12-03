// 浏览器端 API Key 测试工具
// 当服务器端无法连接 Google API 时，可以在浏览器中直接测试

window.testGeminiApiKeyInBrowser = async function(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      error: '请提供 API Key'
    };
  }

  try {
    const trimmedKey = apiKey.trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${encodeURIComponent(trimmedKey)}`;

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

    return {
      success: true,
      message: 'API Key 验证成功（浏览器端测试）',
      model: 'gemini-3-pro-preview',
      testResponse: text.substring(0, 50),
      method: 'browser'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'API Key 验证失败',
      details: error.toString()
    };
  }
};

