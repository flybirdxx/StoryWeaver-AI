// API 客户端工具函数
const API_BASE_URL = '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  model?: string;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { disableAuth?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { disableAuth, ...fetchOptions } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {})
  };

  // 如果不是禁用认证，自动添加 API Key
  if (!disableAuth) {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      const headerObj = headers as Record<string, string>;
      if (!headerObj['X-API-Key'] && !headerObj['Authorization']) {
        headerObj['X-API-Key'] = storedKey;
      }
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

