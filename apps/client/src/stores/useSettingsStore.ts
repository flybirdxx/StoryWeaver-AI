// Zustand Store：全局设置状态管理
// 用于管理 API Keys 等全局设置，替代 React hooks 的局部状态管理

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface SettingsState {
  geminiApiKey: string;
  deepseekApiKey: string;
  setGeminiApiKey: (key: string) => void;
  setDeepseekApiKey: (key: string) => void;
  loadFromLocalStorage: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  immer((set) => ({
    geminiApiKey: '',
    deepseekApiKey: '',
    setGeminiApiKey: (key: string) => {
      set({ geminiApiKey: key });
      localStorage.setItem('gemini_api_key', key);
    },
    setDeepseekApiKey: (key: string) => {
      set({ deepseekApiKey: key });
      localStorage.setItem('deepseek_api_key', key);
    },
    loadFromLocalStorage: () => {
      const gemini = localStorage.getItem('gemini_api_key') || '';
      const deepseek = localStorage.getItem('deepseek_api_key') || '';
      set({ geminiApiKey: gemini, deepseekApiKey: deepseek });
    }
  }))
);

