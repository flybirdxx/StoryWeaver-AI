import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Key, Save, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { maskApiKey } from '../lib/apiKeyMask';

/**
 * SettingsPage - 全局设置页面
 * 从项目内移出，提升至 L1 层级，与书架同级
 */
export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
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

  // 显示/隐藏 API Key 的状态
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  
  // 本地编辑状态（用于区分是编辑中还是显示已保存的 Key）
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [deepseekKeyInput, setDeepseekKeyInput] = useState('');
  const [isGeminiEditing, setIsGeminiEditing] = useState(false);
  const [isDeepseekEditing, setIsDeepseekEditing] = useState(false);

  // 当从 Store 加载 Key 时，初始化输入框
  React.useEffect(() => {
    if (geminiApiKey && !isGeminiEditing) {
      setGeminiKeyInput(maskApiKey(geminiApiKey));
    }
  }, [geminiApiKey, isGeminiEditing]);

  React.useEffect(() => {
    if (deepseekApiKey && !isDeepseekEditing) {
      setDeepseekKeyInput(maskApiKey(deepseekApiKey));
    }
  }, [deepseekApiKey, isDeepseekEditing]);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <motion.button
            whileHover={{ x: -2 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-stone-500 hover:text-orange-600 transition-colors text-sm font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            返回书架
          </motion.button>
          <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">系统设置</h2>
          <p className="text-stone-500 dark:text-stone-400 mt-2">配置 API Key 和全局选项</p>
        </motion.header>
        <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-800 max-w-2xl transition-colors">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              <Key className="w-4 h-4" />
              Gemini API Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showGeminiKey || isGeminiEditing ? 'text' : 'password'}
                  value={isGeminiEditing ? geminiKeyInput : (showGeminiKey ? geminiApiKey : maskApiKey(geminiApiKey))}
                  onChange={(e) => {
                    setGeminiKeyInput(e.target.value);
                    setGeminiApiKey(e.target.value);
                    setIsGeminiEditing(true);
                  }}
                  onFocus={() => {
                    if (!isGeminiEditing) {
                      setGeminiKeyInput(geminiApiKey);
                      setIsGeminiEditing(true);
                    }
                  }}
                  onBlur={() => {
                    if (geminiKeyInput === geminiApiKey) {
                      setIsGeminiEditing(false);
                      setGeminiKeyInput(maskApiKey(geminiApiKey));
                    }
                  }}
                  placeholder="AIzaSy..."
                  className="w-full p-2 pr-10 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
                {geminiApiKey && (
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                    title={showGeminiKey ? '隐藏' : '显示'}
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={saveApiKey}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                保存
              </motion.button>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex items-center gap-2 text-sm ${
                    testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>{testResult.message}</span>
                </motion.div>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">DeepSeek API Key</label>
            <div className="relative">
              <input
                type={showDeepseekKey || isDeepseekEditing ? 'text' : 'password'}
                value={isDeepseekEditing ? deepseekKeyInput : (showDeepseekKey ? deepseekApiKey : maskApiKey(deepseekApiKey))}
                onChange={(e) => {
                  setDeepseekKeyInput(e.target.value);
                  setDeepseekApiKey(e.target.value);
                  setIsDeepseekEditing(true);
                }}
                onFocus={() => {
                  if (!isDeepseekEditing) {
                    setDeepseekKeyInput(deepseekApiKey);
                    setIsDeepseekEditing(true);
                  }
                }}
                onBlur={() => {
                  if (deepseekKeyInput === deepseekApiKey) {
                    setIsDeepseekEditing(false);
                    setDeepseekKeyInput(maskApiKey(deepseekApiKey));
                  }
                }}
                placeholder="sk-xxxx"
                className="w-full p-2 pr-10 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-stone-500 focus:outline-none bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
              {deepseekApiKey && (
                <button
                  type="button"
                  onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  title={showDeepseekKey ? '隐藏' : '显示'}
                >
                  {showDeepseekKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
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
      </div>
    </div>
  );
};
