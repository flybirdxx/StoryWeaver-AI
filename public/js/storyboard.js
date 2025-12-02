// 故事板画布功能（仅电影模式）
const storyboard = {
    panels: [],
    selectedPanelId: null,

    init() {
        this.loadPanels();
    },

    loadPanels() {
        // 从全局数据加载
        if (window.storyboardData && window.storyboardData.panels) {
            this.panels = window.storyboardData.panels;
            console.log('已加载分镜数据:', this.panels.length, '个分镜');
            // 默认选中第一个分镜
            this.selectedPanelId = this.panels[0]?.id || null;
            this.render();
        } else {
            console.log('未找到分镜数据，请先在剧本中心分析剧本');
            this.panels = [];
            this.selectedPanelId = null;
            this.render();
        }
    },

    render() {
        this.renderShotList();
        this.renderDetail();
    },

    /**
     * 渲染左侧分镜列表
     */
    renderShotList() {
        const listEl = document.getElementById('storyboard-panel-list');
        const countEl = document.getElementById('storyboard-panel-count');
        if (!listEl) return;

        const total = this.panels.length;
        if (countEl) {
            countEl.textContent = `${total} 个分镜`;
        }

        if (total === 0) {
            listEl.innerHTML = `
                <div class="w-full text-center py-12 text-stone-400 text-sm">
                    <p class="text-base mb-2">暂无分镜数据</p>
                    <p>请先在「剧本中心」运行一次 AI 导演分析。</p>
                </div>
            `;
            return;
        }

        // 如果当前没有选中分镜，默认选中第一个
        if (!this.selectedPanelId && this.panels[0]) {
            this.selectedPanelId = this.panels[0].id;
        }

        listEl.innerHTML = this.panels.map(panel => {
            const isActive = panel.id === this.selectedPanelId;
            const label = `#${String(panel.id).padStart(2, '0')}`;
            const duration = panel.duration || 3.0;
            const title = panel.dialogue || (panel.prompt || '').slice(0, 60) || '未命名镜头';

            const baseClasses = 'flex gap-3 px-3 py-3 cursor-pointer transition-colors';
            const activeClasses = isActive
                ? 'bg-orange-50 border-l-4 border-orange-500'
                : 'hover:bg-stone-50 border-l-4 border-transparent';

            return `
                <div class="${baseClasses} ${activeClasses}" onclick="storyboard.selectPanel(${panel.id})">
                    <div class="w-16 h-16 rounded-md bg-stone-100 overflow-hidden flex-shrink-0">
                        ${panel.imageUrl
                            ? `<img src="${panel.imageUrl}" alt="Shot ${panel.id}" class="w-full h-full object-cover" ${panel.imageIsUrl ? 'crossorigin="anonymous"' : ''}>`
                            : `<div class="w-full h-full flex items-center justify-center text-[10px] text-stone-400">
                                    Shot ${panel.id}
                               </div>`
                        }
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[10px] font-mono text-stone-400">${label}</span>
                            <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                ${panel.type || 'Mid Shot'}
                            </span>
                            <span class="text-[10px] text-stone-400">${duration}s</span>
                        </div>
                        <p class="text-xs text-stone-800 font-medium truncate">
                            ${title}
                        </p>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * 渲染右侧当前分镜详情
     */
    renderDetail() {
        const detailEl = document.getElementById('storyboard-panel-preview');
        if (!detailEl) return;

        if (this.panels.length === 0 || !this.selectedPanelId) {
            detailEl.innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-2">
                    <p class="text-lg">暂无分镜可预览</p>
                    <p class="text-sm">请先在「剧本中心」分析剧本，并在左侧选择一个分镜。</p>
                </div>
            `;
            return;
        }

        const panel = this.panels.find(p => p.id === this.selectedPanelId) || this.panels[0];
        if (!panel) return;

        const label = `#${String(panel.id).padStart(2, '0')}`;
        const duration = panel.duration || 3.0;

        detailEl.innerHTML = `
            <div class="flex flex-col h-full">
                <div class="px-4 py-2 bg-stone-950 text-xs text-stone-400 font-mono flex items-center justify-between">
                    <span>Shot ${label}</span>
                    <span>${panel.type || 'Mid Shot'} · ${duration}s</span>
                </div>
                <div class="flex-1 bg-stone-900 flex items-center justify-center overflow-hidden">
                    ${panel.imageUrl
                        ? `<img src="${panel.imageUrl}" alt="Shot ${panel.id}" class="w-full h-full object-contain bg-black" ${panel.imageIsUrl ? 'crossorigin="anonymous"' : ''}>`
                        : `<div class="w-full h-full flex flex-col items-center justify-center text-stone-500 text-sm gap-2">
                                <span>[Shot ${panel.id} Image Placeholder]</span>
                                <span class="text-xs opacity-70">生成图像后会在此处展示</span>
                           </div>`
                    }
                </div>
                <div class="p-4 space-y-3 border-t border-stone-200 bg-white">
                    ${panel.dialogue
                        ? `<div>
                                <div class="text-xs font-semibold text-stone-500 mb-1">对白 / 旁白</div>
                                <p class="text-sm text-stone-800 leading-relaxed">${panel.dialogue}</p>
                           </div>`
                        : ''
                    }
                    <div>
                        <div class="text-xs font-semibold text-stone-500 mb-1">图像提示词 (Prompt)</div>
                        <p class="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">${panel.prompt || '暂无提示词'}</p>
                    </div>
                    ${panel.sfx
                        ? `<div>
                                <div class="text-xs font-semibold text-stone-500 mb-1">音效 / SFX</div>
                                <p class="text-xs font-mono text-orange-600">${panel.sfx}</p>
                           </div>`
                        : ''
                    }
                </div>
            </div>
        `;
    },

    /**
     * 选择当前分镜并重新渲染
     */
    selectPanel(id) {
        this.selectedPanelId = id;
        this.render();
    },

    // 已移除漫画渲染，仅保留电影模式

    /**
     * 主生成函数 - 仅电影模式
     */
    async generateImages() {
        console.log('[生成] 当前仅支持电影模式');
        return await this.generateCinematicImages();
    },

    /**
     * 电影模式图像生成 - 独立的生成逻辑
     */
    async generateCinematicImages() {
        // 先尝试重新加载数据
        this.loadPanels();
        
        if (this.panels.length === 0) {
            alert('请先分析剧本生成分镜数据\n\n请前往"剧本中心"输入剧本并点击"AI 导演分析"');
            return;
        }

        const style = document.getElementById('art-style')?.value || 'realism'; // 电影模式默认写实风格
        const characters = window.charactersData || [];

        // 构建角色参考对象
        const characterRefs = {};
        characters.forEach(char => {
            if (char.basePrompt) {
                characterRefs[char.name] = char.basePrompt;
            }
        });

        // 批次处理：每批 3 个
        const batchSize = 3;
        const batchCount = Math.ceil(this.panels.length / batchSize);
        const confirmMsg = this.panels.length > batchSize 
            ? `[电影模式] 将为 ${this.panels.length} 个分镜生成电影风格图像，将自动分成 ${batchCount} 批处理（每批 ${batchSize} 个），这可能需要较长时间。是否继续？`
            : `[电影模式] 将为 ${this.panels.length} 个分镜生成电影风格图像，这可能需要一些时间。是否继续？`;
            
        if (!confirm(confirmMsg)) {
            return;
        }

        // 显示加载状态
        const generateBtn = document.querySelector('button[onclick="storyboard.generateImages()"]');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = '生成中... [电影模式]';
        }

        // 获取 API Key
        const apiKey = localStorage.getItem('gemini_api_key') || '';

        // 电影模式专用参数：16:9 宽屏，电影级画质
        const imageOptions = {
            aspectRatio: '16:9',  // 电影宽屏比例
            imageSize: '4K'        // 4K 分辨率
        };

        console.log(`[电影模式] 开始生成，图片参数:`, imageOptions);
        console.log(`[电影模式] 确认模式参数: cinematic`);

        // 调用统一的流式生成函数
        return await this._generateImagesStream({
            panels: this.panels,
            style: style,
            characterRefs: characterRefs,
            apiKey: apiKey,
            options: imageOptions,
            mode: 'cinematic',
            generateBtn: generateBtn
        });
    },

    // 已移除宫格漫画模式，仅保留电影宽屏模式

    /**
     * 统一的流式图像生成函数（内部使用）
     */
    async _generateImagesStream({ panels, style, characterRefs, apiKey, options, mode, generateBtn }) {

        // 使用流式 API 实时显示
        try {
            // 使用正确的 API 地址（后端运行在 3000 端口）
            const apiBaseUrl = app.apiBaseUrl.replace('/api', ''); // 移除 /api 后缀
            const url = `${apiBaseUrl}/api/image/generate-batch-stream`;
            
            const requestBody = {
                panels: panels,
                style: style,
                characterRefs: characterRefs,
                apiKey: apiKey || undefined,
                options: options,
                mode: mode  // 传递模式参数到后端
            };
            
            console.log(`[流式生成] 发送请求，模式: ${mode}, 图片参数:`, options);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { 'X-API-Key': apiKey } : {})
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let successCount = 0;
            let failedCount = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留最后一个不完整的行

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            switch (data.type) {
                                case 'start':
                                    console.log(`[流式] 开始生成 ${data.total} 个分镜，共 ${data.batchCount} 批`);
                                    break;
                                
                                case 'batch-start':
                                    console.log(`[流式] 批次 ${data.batchIndex}/${data.batchTotal} 开始: ${data.panelIds.join(', ')}`);
                                    if (generateBtn) {
                                        generateBtn.textContent = `生成中... 批次 ${data.batchIndex}/${data.batchTotal}`;
                                    }
                                    break;
                                
                                case 'generating':
                                    console.log(`[流式] 正在生成分镜 ${data.panelId}...`);
                                    break;
                                
                                case 'success':
                                    // 立即更新并显示图像
                                    const panel = panels.find(p => p.id === data.data.panelId);
                                    if (panel && data.data.imageUrl) {
                                        panel.imageUrl = data.data.imageUrl;
                                        panel.imageIsUrl = data.data.isUrl || false;
                                        successCount++;
                                        
                                        // 同步更新 window.storyboardData
                                        if (window.storyboardData) {
                                            window.storyboardData.panels = panels;
                                        }
                                        
                                        // 更新本地 panels 引用
                                        this.panels = panels;
                                        
                                        // 立即重新渲染，显示新生成的图像
                                        this.render();
                                        
                                        console.log(`✓ [${mode === 'cinematic' ? '电影' : '宫格'}] 分镜 ${panel.id} 图像已生成并显示`);
                                    }
                                    break;
                                
                                case 'error':
                                    failedCount++;
                                    console.error(`✗ 分镜 ${data.data?.panelId || '未知'} 生成失败:`, data.data?.error || data.message);
                                    break;
                                
                                case 'batch-complete':
                                    console.log(`[流式] 批次 ${data.batchIndex}/${data.batchTotal} 完成，进度: ${data.completed}/${data.total}`);
                                    if (generateBtn) {
                                        generateBtn.textContent = `生成中... ${data.completed}/${data.total}`;
                                    }
                                    break;
                                
                                case 'complete':
                                    console.log(`[流式] [${mode === 'cinematic' ? '电影' : '宫格'}] 全部完成！成功: ${data.success}，失败: ${data.failed}`);
                                    
                                    // 最终同步更新
                                    if (window.storyboardData) {
                                        window.storyboardData.panels = panels;
                                    }
                                    
                                    // 更新本地 panels 引用
                                    this.panels = panels;
                                    
                                    // 最终渲染
                                    this.render();
                                    
                                    // 显示结果
                                    const modeName = '电影模式';
                                    if (data.failed > 0) {
                                        const errorDetails = (data.errors || []).map(e => 
                                            `分镜 #${e.panelId}: ${e.error}`
                                        ).join('\n');
                                        alert(`[${modeName}] 生成完成！成功: ${data.success} 张，失败: ${data.failed} 张\n\n失败详情:\n${errorDetails}`);
                                    } else if (data.success > 0) {
                                        alert(`[${modeName}] 成功生成 ${data.success} 张图像！`);
                                    } else {
                                        alert(`[${modeName}] 警告：所有分镜都生成失败，请查看控制台日志`);
                                    }
                                    break;
                            }
                        } catch (parseError) {
                            console.error('解析 SSE 数据失败:', parseError, line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('图像生成错误:', error);
            
            let errorMessage = error.message || '生成失败';
            if (error.details) {
                errorMessage = error.details;
            }
            
            alert(`生成失败: ${errorMessage}\n\n请检查:\n1. API Key 是否正确配置且有图像生成权限\n2. 网络连接是否正常\n3. 提示词是否有效`);
        } finally {
            // 恢复按钮状态
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent = '🎥 生成分镜图像 (Gemini 3 Pro)';
            }
        }
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    storyboard.init();
});

