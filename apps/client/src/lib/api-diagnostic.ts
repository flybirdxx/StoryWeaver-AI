// API 诊断工具 - 用于检查 API 连接问题

export async function diagnoseApiConnection() {
  const results = {
    frontend: {
      baseUrl: '/api',
      status: 'unknown' as 'success' | 'error' | 'unknown',
      message: '',
    },
    backend: {
      tsServer: {
        url: 'http://localhost:52301',
        status: 'unknown' as 'success' | 'error' | 'unknown',
        message: '',
      },
      jsServer: {
        url: 'http://localhost:52300',
        status: 'unknown' as 'success' | 'error' | 'unknown',
        message: '',
      },
    },
    geminiApi: {
      status: 'unknown' as 'success' | 'error' | 'unknown',
      message: '',
    },
  };

  // 测试前端代理
  try {
    const healthResponse = await fetch('/api/health');
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      results.frontend.status = 'success';
      results.frontend.message = `连接成功: ${data.version || 'unknown'}`;
    } else {
      results.frontend.status = 'error';
      results.frontend.message = `HTTP ${healthResponse.status}`;
    }
  } catch (error: any) {
    results.frontend.status = 'error';
    results.frontend.message = error.message || '连接失败';
  }

  // 测试 TS 服务器 (52301)
  try {
    const response = await fetch('http://localhost:52301/api/health');
    if (response.ok) {
      results.backend.tsServer.status = 'success';
      results.backend.tsServer.message = 'TS 服务器运行正常';
    } else {
      results.backend.tsServer.status = 'error';
      results.backend.tsServer.message = `HTTP ${response.status}`;
    }
  } catch (error: any) {
    results.backend.tsServer.status = 'error';
    results.backend.tsServer.message = error.message || '无法连接';
  }

  // 测试 JS 服务器 (52300)
  try {
    const response = await fetch('http://localhost:52300/api/health');
    if (response.ok) {
      results.backend.jsServer.status = 'success';
      results.backend.jsServer.message = 'JS 服务器运行正常';
    } else {
      results.backend.jsServer.status = 'error';
      results.backend.jsServer.message = `HTTP ${response.status}`;
    }
  } catch (error: any) {
    results.backend.jsServer.status = 'error';
    results.backend.jsServer.message = error.message || '无法连接';
  }

  // 测试 Gemini API（需要 API Key）
  const apiKey = localStorage.getItem('gemini_api_key');
  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'test' }] }],
          }),
        }
      );
      if (response.ok) {
        results.geminiApi.status = 'success';
        results.geminiApi.message = 'Gemini API 连接正常';
      } else {
        const errorData = await response.json().catch(() => ({}));
        results.geminiApi.status = 'error';
        results.geminiApi.message = errorData.error?.message || `HTTP ${response.status}`;
      }
    } catch (error: any) {
      results.geminiApi.status = 'error';
      results.geminiApi.message = error.message || '连接失败';
    }
  } else {
    results.geminiApi.message = '未配置 API Key';
  }

  return results;
}

