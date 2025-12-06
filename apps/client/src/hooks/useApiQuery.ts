import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, type ApiResponse } from '../lib/api';

// 通用查询Hook
export function useApiQuery<T = any>(
  key: string[],
  endpoint: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await apiRequest<T>(endpoint);
      if (!response.success) {
        throw new Error(response.error || '请求失败');
      }
      return response.data;
    },
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime,
  });
}

// 通用Mutation Hook
export function useApiMutation<TData = any, TVariables = any>(
  endpoint: string | ((variables: TVariables) => string),
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    invalidateQueries?: string[][];
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      // 支持动态endpoint（用于PUT/DELETE需要ID的情况）
      const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint;
      
      // 如果 variables 有 data 字段（如 { id, data }），只发送 data 部分
      // 这是为了兼容 PUT /characters/:id 这种需要 ID 在 URL 中的情况
      let body: any = variables;
      if (variables && typeof variables === 'object' && 'data' in variables && 'id' in variables) {
        // 提取 data 字段作为请求体
        body = (variables as any).data;
        console.log('[useApiMutation] 提取 data 字段作为请求体:', {
          id: (variables as any).id,
          dataKeys: Object.keys(body),
          hasImageUrl: 'imageUrl' in body
        });
      }
      
      const response = await apiRequest<TData>(url, {
        method,
        body: method !== 'DELETE' ? JSON.stringify(body) : undefined,
      });
      if (!response.success) {
        throw new Error(response.error || '操作失败');
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      // 使相关查询失效，触发重新获取
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });
}

