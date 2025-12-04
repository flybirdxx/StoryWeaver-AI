// API 诊断工具 - 用于检查 API 连接问题和环境配置

export interface DiagnosticResults {
  frontend: {
    baseUrl: string;
    status: 'success' | 'error' | 'unknown';
    message: string;
  };
  backend: {
    tsServer: {
      url: string;
      status: 'success' | 'error' | 'unknown';
      message: string;
    };
    jsServer: {
      url: string;
      status: 'success' | 'error' | 'unknown';
      message: string;
    };
  };
  geminiApi: {
    status: 'success' | 'error' | 'unknown';
    message: string;
    configured: boolean;
  };
  environment: {
    uploadsFolder: {
      exists: boolean;
      writable: boolean;
      message: string;
    };
    apiKey: {
      configured: boolean;
      valid: boolean;
      message: string;
    };
  };
}

export async function diagnoseApiConnection(): Promise<DiagnosticResults> {
  const results: DiagnosticResults = {
    frontend: {
      baseUrl: '/api',
      status: 'unknown',
      message: '',
    },
    backend: {
      tsServer: {
        url: 'http://localhost:52301',
        status: 'unknown',
        message: '',
      },
      jsServer: {
        url: 'http://localhost:52300',
        status: 'unknown',
        message: '',
      },
    },
    geminiApi: {
      status: 'unknown',
      message: '',
      configured: false,
    },
    environment: {
      uploadsFolder: {
        exists: false,
        writable: false,
        message: '',
      },
      apiKey: {
        configured: false,
        valid: false,
        message: '',
      },
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
  results.environment.apiKey.configured = !!apiKey;
  
  if (apiKey) {
    results.geminiApi.configured = true;
    try {
      // 使用服务器端的 test-key 接口进行验证（更可靠）
      const testResponse = await fetch('/api/settings/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        if (testData.success) {
          results.geminiApi.status = 'success';
          results.geminiApi.message = 'Gemini API Key 有效';
          results.environment.apiKey.valid = true;
          results.environment.apiKey.message = 'API Key 已验证有效';
        } else {
          results.geminiApi.status = 'error';
          results.geminiApi.message = testData.error || 'API Key 验证失败';
          results.environment.apiKey.valid = false;
          results.environment.apiKey.message = testData.error || '验证失败';
        }
      } else {
        // 如果服务器端测试失败，尝试浏览器端直接测试
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
          results.geminiApi.message = 'Gemini API 连接正常（浏览器端测试）';
          results.environment.apiKey.valid = true;
          results.environment.apiKey.message = 'API Key 有效（浏览器端验证）';
        } else {
          const errorData = await response.json().catch(() => ({}));
          results.geminiApi.status = 'error';
          results.geminiApi.message = errorData.error?.message || `HTTP ${response.status}`;
          results.environment.apiKey.valid = false;
          results.environment.apiKey.message = errorData.error?.message || '验证失败';
        }
      }
    } catch (error: any) {
      results.geminiApi.status = 'error';
      results.geminiApi.message = error.message || '连接失败';
      results.environment.apiKey.valid = false;
      results.environment.apiKey.message = error.message || '无法验证';
    }
  } else {
    results.geminiApi.message = '未配置 API Key';
    results.environment.apiKey.message = '未配置 API Key，请在设置页面配置';
  }

  // 检查环境配置（文件夹权限等）
  try {
    const envResponse = await fetch('/api/settings/check-environment');
    if (envResponse.ok) {
      const envData = await envResponse.json();
      if (envData.success && envData.data) {
        results.environment.uploadsFolder = envData.data.uploadsFolder;
        // API Key 配置状态已在上面检查
      }
    } else {
      results.environment.uploadsFolder.message = '无法检查环境配置';
    }
  } catch (error: any) {
    results.environment.uploadsFolder.message = `环境检查失败: ${error.message}`;
  }

  return results;
}

/**
 * 获取诊断结果的摘要信息
 */
export function getDiagnosticSummary(results: DiagnosticResults): {
  overall: 'healthy' | 'warning' | 'error';
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // 检查前端连接
  if (results.frontend.status === 'error') {
    issues.push('前端 API 代理连接失败');
    suggestions.push('检查开发服务器是否运行');
  }

  // 检查后端连接
  if (results.backend.tsServer.status === 'error' && results.backend.jsServer.status === 'error') {
    issues.push('后端服务器连接失败');
    suggestions.push('检查后端服务器是否运行（端口 52301 或 52300）');
  }

  // 检查 API Key
  if (!results.environment.apiKey.configured) {
    issues.push('未配置 Gemini API Key');
    suggestions.push('前往设置页面配置 API Key');
  } else if (!results.environment.apiKey.valid) {
    issues.push('Gemini API Key 无效或验证失败');
    suggestions.push('检查 API Key 是否正确，或前往设置页面重新配置');
  }

  // 检查 uploads 文件夹
  if (!results.environment.uploadsFolder.exists) {
    issues.push('uploads 文件夹不存在');
    suggestions.push('检查服务器是否有创建文件夹的权限');
  } else if (!results.environment.uploadsFolder.writable) {
    issues.push('uploads 文件夹不可写');
    suggestions.push('检查服务器对 uploads 文件夹的写入权限');
  }

  // 确定整体状态
  let overall: 'healthy' | 'warning' | 'error' = 'healthy';
  if (issues.length > 0) {
    const criticalIssues = issues.filter(
      issue => issue.includes('后端服务器') || issue.includes('不可写')
    );
    overall = criticalIssues.length > 0 ? 'error' : 'warning';
  }

  return { overall, issues, suggestions };
}

