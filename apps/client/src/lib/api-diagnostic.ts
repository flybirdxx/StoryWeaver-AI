// API 连接诊断工具
// 用于检查前端是否能正确连接到后端 API

export async function diagnoseApiConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // 测试健康检查端点
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        success: false,
        message: `后端服务器响应异常: HTTP ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText
        }
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: '✅ API 连接正常',
      details: data
    };
  } catch (error: any) {
    // 分析错误类型
    let message = '❌ 无法连接到后端 API';
    let details: any = {};

    if (error.message?.includes('Failed to fetch')) {
      message = '❌ 无法连接到后端服务器 (ERR_CONNECTION_REFUSED)';
      details = {
        error: '连接被拒绝',
        possibleCauses: [
          '后端服务器未启动',
          '后端服务器已崩溃',
          '端口被占用',
          '防火墙阻止连接'
        ],
        suggestions: [
          '1. 检查终端中后端服务器是否正在运行',
          '2. 确认后端服务器运行在 http://localhost:52301',
          '3. 尝试在浏览器中直接访问 http://localhost:52301/api/health',
          '4. 检查是否有端口冲突',
          '5. 重启开发服务器: 按 Ctrl+C 停止，然后重新运行 npm run dev'
        ]
      };
    } else if (error.message?.includes('NetworkError')) {
      message = '❌ 网络错误';
      details = { error: error.message };
    } else {
      message = `❌ 未知错误: ${error.message}`;
      details = { error: error.message };
    }

    return {
      success: false,
      message,
      details
    };
  }
}

// 在控制台输出诊断信息
export async function logDiagnostics() {
  console.group('🔍 API 连接诊断');
  const result = await diagnoseApiConnection();
  console.log(result.message);
  if (result.details) {
    console.log('详细信息:', result.details);
  }
  console.groupEnd();
  return result;
}
