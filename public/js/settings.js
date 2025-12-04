// 系统设置功能
const settings = {
    init() {
        this.loadSettings();
    },

    loadSettings() {
        // 从 localStorage 加载 API Key（前端存储，仅用于演示）
        const savedKey = localStorage.getItem('gemini_api_key');
        const input = document.getElementById('api-key-input');
        if (input && savedKey) {
            input.value = savedKey;
        }

        const deepseekInput = document.getElementById('deepseek-key-input');
        const savedDeepseek = localStorage.getItem('deepseek_api_key');
        if (deepseekInput && savedDeepseek) {
            deepseekInput.value = savedDeepseek;
        }
    },

    async testApiKey() {
        const input = document.getElementById('api-key-input');
        const testBtn = document.getElementById('test-key-btn');
        const testText = document.getElementById('test-key-text');
        const testResult = document.getElementById('test-result');
        
        if (!input) return;

        const apiKey = input.value.trim();
        
        if (!apiKey) {
            alert('请先输入 API Key');
            return;
        }

        // 更新按钮状态
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.classList.add('opacity-50', 'cursor-not-allowed');
            if (testText) testText.textContent = '测试中...';
        }

        // 隐藏之前的结果
        if (testResult) {
            testResult.classList.add('hidden');
        }

        try {
            // 先尝试服务器端测试
            let response;
            try {
                response = await app.apiRequest('/settings/test-key', {
                method: 'POST',
                body: JSON.stringify({ apiKey: apiKey }),
                disableAuth: true
            });
            } catch (serverError) {
                // 如果服务器端测试失败（可能是网络问题），尝试浏览器端测试
                console.warn('服务器端测试失败，尝试浏览器端测试:', serverError.message);
                
                if (typeof window.testGeminiApiKeyInBrowser === 'function') {
                    response = await window.testGeminiApiKeyInBrowser(apiKey);
                } else {
                    throw serverError; // 如果浏览器端测试不可用，抛出原始错误
                }
            }

            if (response.success) {
                // 显示成功消息
                if (testResult) {
                    const method = response.method === 'browser' ? '（浏览器端测试）' : '';
                    testResult.className = 'flex items-center text-sm text-green-600';
                    testResult.innerHTML = `
                        <span class="mr-1">✓</span>
                        <span>API Key 验证成功 ${method} (${response.model || 'gemini-3-pro-preview'})</span>
                    `;
                    testResult.classList.remove('hidden');
                }
                
                // 自动保存有效的 API Key
                localStorage.setItem('gemini_api_key', apiKey);
            } else {
                throw new Error(response.error || '验证失败');
            }
        } catch (error) {
            console.error('API Key 测试失败:', error);
            
            // 检查是否是网络连接问题
            const isNetworkError = error.message && (
                error.message.includes('fetch failed') ||
                error.message.includes('连接超时') ||
                error.message.includes('Connect Timeout') ||
                error.message.includes('UND_ERR_CONNECT_TIMEOUT')
            );
            
            let errorMsg = error.message || 'API Key 验证失败';
            if (isNetworkError) {
                errorMsg += '\n\n提示：服务器无法连接到 Google API。\n如果您的浏览器可以访问，可以尝试直接保存 API Key。';
            }
            
            // 显示错误消息
            if (testResult) {
                testResult.className = 'flex items-center text-sm text-red-600';
                testResult.innerHTML = `
                    <span class="mr-1">✗</span>
                    <span>${errorMsg}</span>
                `;
                testResult.classList.remove('hidden');
            } else {
                alert(`API Key 验证失败: ${errorMsg}`);
            }
        } finally {
            // 恢复按钮状态
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                if (testText) testText.textContent = '测试';
            }
        }
    },

    saveApiKey() {
        const input = document.getElementById('api-key-input');
        if (!input) return;

        const apiKey = input.value.trim();
        
        if (!apiKey) {
            alert('请输入 API Key');
            return;
        }

        // 保存到 localStorage
        localStorage.setItem('gemini_api_key', apiKey);
        
        // 显示保存成功消息
        const testResult = document.getElementById('test-result');
        if (testResult) {
            testResult.className = 'flex items-center text-sm text-blue-600';
            testResult.innerHTML = `
                <span class="mr-1">✓</span>
                <span>已保存到本地存储</span>
            `;
            testResult.classList.remove('hidden');
            
            // 3秒后隐藏消息
            setTimeout(() => {
                if (testResult) testResult.classList.add('hidden');
            }, 3000);
        } else {
            alert('API Key 已保存');
        }
    },

    saveDeepseekKey() {
        const input = document.getElementById('deepseek-key-input');
        if (!input) return;

        const apiKey = input.value.trim();
        if (!apiKey) {
            alert('请输入 DeepSeek API Key');
            return;
        }

        localStorage.setItem('deepseek_api_key', apiKey);
        this.showTemporaryMessage('deepseek-save-result', '已保存到本地存储', 'text-blue-600');
    },

    showTemporaryMessage(elementId, message, textClass = 'text-blue-600') {
        const el = document.getElementById(elementId);
        if (!el) return;

        el.className = `flex items-center text-sm ${textClass}`;
        el.innerHTML = `<span class="mr-1">✓</span><span>${message}</span>`;
        el.classList.remove('hidden');

        setTimeout(() => {
            el.classList.add('hidden');
        }, 3000);
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    settings.init();
});

