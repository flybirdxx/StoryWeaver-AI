import React from 'react';
import { useSettings } from '../hooks/useSettings';

export const SettingsPage: React.FC = () => {
  const {
    geminiApiKey,
    setGeminiApiKey,
    deepseekApiKey,
    setDeepseekApiKey,
    isTestingKey,
    testResult,
    testApiKey,
    saveApiKey,
    saveDeepseekKey
  } = useSettings();

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">系统设置</h2>
      </header>
      <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-800 max-w-2xl transition-colors">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Gemini API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 p-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
              <button
                onClick={testApiKey}
                disabled={isTestingKey}
                className="px-4 py-2 bg-stone-600 text-white rounded-lg text-sm hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isTestingKey ? '测试中...' : '测试'}</span>
              </button>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">用于访问 Gemini 3 Pro (逻辑分析和图像生成)。</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveApiKey}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors"
              >
                保存
              </button>
              {testResult && (
                <div
                  className={`flex items-center text-sm ${
                    testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  <span className="mr-1">{testResult.success ? '✓' : '✗'}</span>
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">DeepSeek API Key</label>
            <input
              type="password"
              value={deepseekApiKey}
              onChange={(e) => setDeepseekApiKey(e.target.value)}
              placeholder="sk-xxxx"
              className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-stone-500 focus:outline-none bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">用于脚本推理（DeepSeek V3.2），不会与图像生成 Key 混用。</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveDeepseekKey}
                className="px-4 py-2 bg-stone-800 dark:bg-stone-700 text-white rounded-lg text-sm hover:bg-black dark:hover:bg-stone-600 transition-colors"
              >
                保存
              </button>
              {testResult && testResult.message.includes('DeepSeek') && (
                <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                  <span className="mr-1">✓</span>
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">默认导出格式</label>
            <select className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">
              <option>PDF (A4 打印)</option>
              <option>Long Image (条漫 webtoon)</option>
              <option>MP4 (Animatic 预览 - 需 VEO)</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
};
