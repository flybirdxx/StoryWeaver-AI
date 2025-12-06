import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';
import { toast } from '../lib/toast';
import { useSettingsStore } from '../stores/useSettingsStore';

interface UseSettingsReturn {
  geminiApiKey: string;
  setGeminiApiKey: (value: string) => void;
  deepseekApiKey: string;
  setDeepseekApiKey: (value: string) => void;
  isTestingKey: boolean;
  testResult: { success: boolean; message: string } | null;
  testApiKey: () => Promise<void>;
  saveApiKey: () => void;
  saveDeepseekKey: () => void;
}

export function useSettings(): UseSettingsReturn {
  // 使用 Zustand Store 管理全局状态
  const geminiApiKey = useSettingsStore((state) => state.geminiApiKey);
  const deepseekApiKey = useSettingsStore((state) => state.deepseekApiKey);
  const setGeminiApiKeyStore = useSettingsStore((state) => state.setGeminiApiKey);
  const setDeepseekApiKeyStore = useSettingsStore((state) => state.setDeepseekApiKey);
  const loadFromLocalStorage = useSettingsStore((state) => state.loadFromLocalStorage);
  
  // UI 状态保持局部
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 从 localStorage 加载保存的 API Keys（初始化时）
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // 包装 setter 以保持 API 兼容性
  const setGeminiApiKey = useCallback((value: string) => {
    setGeminiApiKeyStore(value);
  }, [setGeminiApiKeyStore]);

  const setDeepseekApiKey = useCallback((value: string) => {
    setDeepseekApiKeyStore(value);
  }, [setDeepseekApiKeyStore]);

  const testApiKey = useCallback(async () => {
    const apiKey = geminiApiKey.trim();
    
    if (!apiKey) {
      toast.warning('请先输入 API Key');
      return;
    }

    setIsTestingKey(true);
    setTestResult(null);

    try {
      const response = await apiRequest('/settings/test-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey }),
        disableAuth: true
      });

      if (response.success) {
        setTestResult({
          success: true,
          message: `API Key 验证成功 (${response.model || 'gemini-3-pro-preview'})`
        });
        // 自动保存有效的 API Key（Store 会自动同步到 localStorage）
        setGeminiApiKeyStore(apiKey);
      } else {
        throw new Error(response.error || '验证失败');
      }
    } catch (error: any) {
      console.error('API Key 测试失败:', error);
      setTestResult({
        success: false,
        message: error.message || 'API Key 验证失败'
      });
    } finally {
      setIsTestingKey(false);
    }
  }, [geminiApiKey, setGeminiApiKeyStore]);

  const saveApiKey = useCallback(() => {
    const apiKey = geminiApiKey.trim();
    
    if (!apiKey) {
      toast.warning('请输入 API Key');
      return;
    }

    // Store 会自动同步到 localStorage
    setGeminiApiKeyStore(apiKey);
    setTestResult({
      success: true,
      message: '已保存到本地存储'
    });
    
    // 3秒后清除消息
    setTimeout(() => {
      setTestResult(null);
    }, 3000);
  }, [geminiApiKey, setGeminiApiKeyStore]);

  const saveDeepseekKey = useCallback(() => {
    const apiKey = deepseekApiKey.trim();
    
    if (!apiKey) {
      toast.warning('请输入 DeepSeek API Key');
      return;
    }

    // Store 会自动同步到 localStorage
    setDeepseekApiKeyStore(apiKey);
    setTestResult({
      success: true,
      message: 'DeepSeek API Key 已保存到本地存储'
    });
    
    // 3秒后清除消息
    setTimeout(() => {
      setTestResult(null);
    }, 3000);
  }, [deepseekApiKey, setDeepseekApiKeyStore]);

  return {
    geminiApiKey,
    setGeminiApiKey,
    deepseekApiKey,
    setDeepseekApiKey,
    isTestingKey,
    testResult,
    testApiKey,
    saveApiKey,
    saveDeepseekKey
  };
}

