// 剧本中心功能
const scriptStudio = {
    currentAnalysis: null,

    formatAnalysisMarkdown(result) {
        if (!result) return '// 暂无分析结果';

        const characters = Array.isArray(result.characters) ? result.characters : [];
        const panels = Array.isArray(result.panels) ? result.panels.slice(0, 5) : [];

        const lines = [
            '# 🎬 剧本分析摘要',
            '',
            `- 主题：${result.theme || '未知'}`,
            `- 分镜数量：${result.panels?.length || 0}`,
            `- 生成时间：${new Date().toLocaleString()}`,
            '',
            '## 角色一览'
        ];

        if (characters.length === 0) {
            lines.push('_暂无角色数据_');
        } else {
            lines.push(
                ...characters.map(char => {
                    const tags = Array.isArray(char.tags) && char.tags.length > 0
                        ? `（${char.tags.join(', ')}）`
                        : '';
                    return `- **${char.name || '未命名'}** ${tags}：${char.description || char.basePrompt || ''}`;
                })
            );
        }

        lines.push('', '## 分镜示例');

        if (panels.length === 0) {
            lines.push('_暂无分镜数据_');
        } else {
            lines.push(
                ...panels.map(panel => {
                    return `- **#${panel.id || '?'} ${panel.type || 'Shot'}**：${panel.prompt || panel.dialogue || '暂无描述'}`;
                })
            );
        }

        lines.push('', '```json', JSON.stringify(result, null, 2), '```');
        return lines.join('\n');
    },

    renderAnalysisOutput(result) {
        const output = document.getElementById('analysisResult');
        if (!output) return;

        output.classList.remove('font-mono', 'text-green-400');
        output.classList.add('text-stone-100', 'leading-relaxed', 'tracking-wide');

        const markdown = this.formatAnalysisMarkdown(result);
        if (window.marked) {
            output.innerHTML = window.marked.parse(markdown);
        } else {
            output.textContent = markdown;
        }
        output.scrollTop = 0;
    },

    async analyzeScript() {
        const input = document.getElementById('scriptInput');
        const output = document.getElementById('analysisResult');
        const status = document.getElementById('analysisStatus');

        if (!input || !output || !status) return;

        const scriptText = input.value.trim();

        if (!scriptText) {
            output.innerText = "// 错误: 请先输入剧本。";
            return;
        }

        // UI 反馈
        status.innerText = "Processing...";
        status.classList.remove('text-green-500');
        status.classList.add('text-orange-500');
        output.innerText = "// 正在调用 Input Analysis Agent...\n// 正在解析场景与角色...";

        // 动画效果 + 感知等待
        if (typeof dashboard !== 'undefined') {
            dashboard.animatePipeline(1);
            setTimeout(() => dashboard.animatePipeline(2), 500);
            setTimeout(() => dashboard.animatePipeline(3), 1000);
        }

        if (app && app.processingSteps) {
            app.processingSteps.start([
                '正在解析场景结构...',
                '识别角色与关系...',
                '构建镜头提示词...',
                '等待 LLM 输出...'
            ]);
        }

        try {
            // 获取角色数据和 API Key
            const existingCharacters = window.charactersData || [];
            const deepseekKey = localStorage.getItem('deepseek_api_key') || '';
            const modelSelect = document.getElementById('script-model-select');
            const provider = modelSelect ? (modelSelect.value || 'gemini') : 'gemini';

            const response = await app.apiRequest('/script/analyze', {
                method: 'POST',
                body: JSON.stringify({
                    script: scriptText,
                    characters: existingCharacters,
                    provider,
                    deepseekKey: provider === 'deepseek' ? (deepseekKey || undefined) : undefined
                })
            });

            if (response.success) {
                status.innerText = "Done";
                status.classList.remove('text-orange-500');
                status.classList.add('text-green-500');
                this.renderAnalysisOutput(response.data);
                
                // 保存分析结果
                this.currentAnalysis = response.data;
                window.storyboardData = response.data;

                // 自动同步角色到角色库
                if (Array.isArray(response.data.characters) && response.data.characters.length > 0) {
                    window.charactersData = response.data.characters;
                    // 注意：characters.js 中使用的是顶层 const characters，不能通过 window.characters 访问
                    if (typeof characters !== 'undefined' && typeof characters.syncFromAnalysis === 'function') {
                        console.log('[脚本分析] 检测到角色列表，开始同步到角色库...', response.data.characters);
                        await characters.syncFromAnalysis(response.data.characters);
                        if (app && app.processingSteps) {
                            app.processingSteps.mark('角色特征已同步');
                        }
                    } else {
                        console.warn('[脚本分析] 找不到 characters 模块或 syncFromAnalysis 方法，跳过自动同步。');
                    }
                } else {
                    console.log('[脚本分析] 本次分析结果中未返回 characters 字段或为空，跳过自动同步。');
                }
                
                console.log('剧本分析完成，分镜数据已保存:', {
                    theme: response.data.theme,
                    panelsCount: response.data.panels?.length || 0
                });

                // 更新图表
                if (typeof dashboard !== 'undefined') {
                    dashboard.renderCharts();
                }

                // 显示成功提示（非阻塞）
                const panelCount = response.data.panels?.length || 0;
                const successMsg = `✅ 分析完成！已生成 ${panelCount} 个分镜。\n\n下一步将自动跳转到「角色库」，请确认并完善角色后，再进入故事板生成分镜图像。`;
                
                // 创建自定义通知（非阻塞）
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
                notification.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">✅</span>
                        <div>
                            <p class="font-bold">分析完成！</p>
                            <p class="text-sm mt-1">已生成 ${panelCount} 个分镜</p>
                            <p class="text-xs mt-2 opacity-90">将在 3 秒后自动跳转到角色库进行角色确认...</p>
                        </div>
                        <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-white hover:text-gray-200">✕</button>
                    </div>
                `;
                document.body.appendChild(notification);
                
                // 3 秒后自动跳转到角色库（可被用户手动导航覆盖）
                let autoNavTimer = setTimeout(() => {
                    app.navTo('characters');
                    notification.remove();
                }, 3000);
                
                // 如果用户点击关闭按钮，取消自动跳转
                notification.querySelector('button').addEventListener('click', () => {
                    clearTimeout(autoNavTimer);
                });
                
                // 5 秒后自动移除通知
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 5000);
                if (app && app.processingSteps) {
                    app.processingSteps.finish('剧本分析完成 ✅');
                }
            }
        } catch (error) {
            status.innerText = "Error";
            status.classList.remove('text-green-500', 'text-orange-500');
            status.classList.add('text-red-500');
            output.innerText = `// 错误: ${error.message}\n// 请检查 API 配置和网络连接。`;
            console.error('分析失败:', error);
            if (app && app.processingSteps) {
                app.processingSteps.finish(`剧本分析失败：${error.message}`, 'error');
            }
        } finally {
            // 重置动画
            if (typeof dashboard !== 'undefined') {
                setTimeout(() => {
                    ['stage-1', 'stage-2', 'stage-3'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.classList.remove('stage-processing');
                    });
                }, 2000);
            }
        }
    },

    saveToShelf() {
        const titleInput = document.getElementById('script-project-title');
        const tagsInput = document.getElementById('script-project-tags');
        const scriptInput = document.getElementById('scriptInput');

        if (!titleInput || !tagsInput || !scriptInput) {
            alert('无法找到保存所需的输入区域。');
            return;
        }

        const title = titleInput.value.trim();
        if (!title) {
            alert('请先填写项目标题再保存到书架。');
            titleInput.focus();
            return;
        }

        if (!this.currentAnalysis) {
            alert('请先运行“AI 导演分析”，再保存结果到书架。');
            return;
        }

        const panels = this.currentAnalysis.panels || [];
        const tags = tagsInput.value
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean);

        const shelf = typeof dashboard !== 'undefined' ? dashboard.getShelf() : [];
        const existing = shelf.find(item => item.name === title);
        const projectId = existing ? existing.id : (this.currentAnalysis.projectId || `proj-${Date.now()}`);

        const projectPayload = {
            id: projectId,
            name: title,
            tags: tags.length > 0 ? tags : ['未分类'],
            logline: this.currentAnalysis.logline || this.currentAnalysis.theme || '暂无简介',
            theme: this.currentAnalysis.theme || '',
            updatedAt: new Date().toISOString(),
            generatedPanels: panels.length,
            totalPanels: panels.length,
            availableFeatures: ['analysis', 'storyboard', 'characters', 'image'],
            analysis: {
                ...this.currentAnalysis,
                projectId
            },
            script: scriptInput.value.trim(),
            stats: {
                scenes: this.currentAnalysis.structure?.length || this.currentAnalysis.scenes?.length || Math.max(1, Math.round(panels.length / 3)),
                stage: 'Visual Prompter'
            }
        };

        try {
            if (typeof dashboard !== 'undefined') {
                dashboard.saveProjectToShelf(projectPayload);
            }
            this.currentAnalysis.projectId = projectId;
            localStorage.setItem('script_project_title', title);
            localStorage.setItem('script_project_tags', tagsInput.value.trim());

            const toast = document.createElement('div');
            toast.className = 'fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50';
            toast.textContent = '✅ 已保存到书架，可在概览页切换项目。';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
        } catch (error) {
            console.error('保存到书架失败:', error);
            alert('保存失败，请稍后再试。');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const titleInput = document.getElementById('script-project-title');
    const tagsInput = document.getElementById('script-project-tags');
    const modelSelect = document.getElementById('script-model-select');
    if (titleInput) {
        const savedTitle = localStorage.getItem('script_project_title');
        if (savedTitle) titleInput.value = savedTitle;
    }
    if (tagsInput) {
        const savedTags = localStorage.getItem('script_project_tags');
        if (savedTags) tagsInput.value = savedTags;
    }
    if (modelSelect) {
        const savedModel = localStorage.getItem('script_model_provider');
        if (savedModel) modelSelect.value = savedModel;
        modelSelect.addEventListener('change', () => {
            localStorage.setItem('script_model_provider', modelSelect.value);
        });
    }
});

