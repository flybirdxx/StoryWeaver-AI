// 角色库管理功能
const characters = {
    charactersList: [],

    async init() {
        await this.loadCharacters();
        this.render();
    },

    async loadCharacters() {
        try {
            const response = await app.apiRequest('/characters');
            if (response.success) {
                this.charactersList = response.data;
                window.charactersData = response.data;
            }
        } catch (error) {
            console.error('加载角色失败:', error);
        }
    },

    render() {
        const container = document.getElementById('characters-grid');
        if (!container) return;

        if (this.charactersList.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-stone-400">
                    <p class="text-lg mb-2">暂无角色</p>
                    <p class="text-sm">点击"新建角色"开始创建</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.charactersList.map(char => `
            <div class="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden group hover:border-orange-400 transition-all">
                <div class="h-48 bg-stone-200 relative">
                    ${char.imageUrl 
                        ? `<img src="${char.imageUrl}" alt="${char.name}" class="w-full h-full object-cover">`
                        : `<div class="absolute inset-0 flex items-center justify-center text-stone-400">
                                [Character Ref Image]
                           </div>`
                    }
                    <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="characters.generateImage('${char.id}')"
                                class="p-1 bg-stone-800 text-white rounded text-xs">
                            生成参考图
                        </button>
                        <button onclick="characters.deleteCharacter('${char.id}')" 
                                class="p-1 bg-red-500 text-white rounded text-xs">
                            删除
                        </button>
                    </div>
                </div>
                <div class="p-6">
                    <h3 class="text-xl font-bold text-stone-800">${char.name}</h3>
                    <div class="flex gap-2 mt-2 mb-4">
                        ${(char.tags || []).map(tag => 
                            `<span class="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded">${tag}</span>`
                        ).join('')}
                    </div>
                    <div class="text-xs text-stone-500 font-mono bg-stone-50 p-2 rounded border border-stone-100 h-20 overflow-y-auto">
                        Base Prompt: ${char.basePrompt || 'N/A'}
                    </div>
                </div>
            </div>
        `).join('');
    },

    showCreateModal() {
        const modal = document.getElementById('character-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    hideCreateModal() {
        const modal = document.getElementById('character-modal');
        if (modal) {
            modal.classList.add('hidden');
            const form = document.getElementById('character-form');
            if (form) form.reset();
        }
    },

    async createCharacter(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const characterData = {
            name: formData.get('name'),
            description: formData.get('description'),
            tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [],
            basePrompt: formData.get('basePrompt')
        };

        try {
            const response = await app.apiRequest('/characters', {
                method: 'POST',
                body: JSON.stringify(characterData)
            });

            if (response.success) {
                this.hideCreateModal();
                await this.loadCharacters();
                this.render();
            }
        } catch (error) {
            alert(`创建角色失败: ${error.message}`);
        }
    },

    async syncFromAnalysis(extractedCharacters = []) {
        if (!Array.isArray(extractedCharacters) || extractedCharacters.length === 0) {
            return;
        }

        // 兼容多种 LLM 输出格式，将字符串 / 其他字段名规范化为 { name, description, tags, basePrompt }
        const normalized = extractedCharacters
            .map(item => {
                if (!item) return null;

                // 纯字符串：视为角色名
                if (typeof item === 'string') {
                    return { name: item };
                }

                if (typeof item === 'object') {
                    let name =
                        item.name ||
                        item.fullName ||
                        item.character ||
                        item.id ||
                        item.alias;

                    if (!name || typeof name !== 'string') {
                        return null;
                    }

                    let description =
                        item.description ||
                        item.role ||
                        item.background ||
                        item.personality ||
                        '';

                    const tagsSource =
                        item.tags ||
                        item.traits ||
                        item.attributes ||
                        item.keywords ||
                        [];

                    let tags = [];
                    if (Array.isArray(tagsSource)) {
                        tags = tagsSource;
                    } else if (typeof tagsSource === 'string') {
                        tags = tagsSource.split(/[,，、]/);
                    }

                    let basePrompt =
                        item.basePrompt ||
                        item.base_prompt ||
                        item.prompt ||
                        item.visual ||
                        item.look ||
                        '';

                    // 统一角色名：去掉括号及之后的英文补充，避免重复（例如 "沈军 (Shen Jun) - 30s..." -> "沈军"）
                    name = name.split(/[(（]/)[0].trim();

                    const cleanTags = tags
                        .map(t => (typeof t === 'string' ? t.trim() : ''))
                        .filter(Boolean);

                    description = description ? description.trim() : '';
                    basePrompt = basePrompt ? basePrompt.trim() : '';

                    // 如果没有提供 basePrompt，则根据描述和标签自动拼一个基础提示词
                    if (!basePrompt && (description || cleanTags.length)) {
                        basePrompt = [
                            description,
                            cleanTags.length ? `traits: ${cleanTags.join(', ')}` : ''
                        ]
                            .filter(Boolean)
                            .join('. ');
                    }

                    return {
                        name,
                        description,
                        basePrompt,
                        tags: cleanTags
                    };
                }

                return null;
            })
            .filter(Boolean);

        if (normalized.length === 0) {
            console.warn('[角色库] 脚本分析返回的角色列表无法解析，已跳过自动同步。原始数据:', extractedCharacters);
            return;
        }

        try {
            const response = await app.apiRequest('/characters/sync', {
                method: 'POST',
                body: JSON.stringify({ characters: normalized })
            });

            if (response.success && response.data) {
                this.charactersList = response.data.list || [];
                window.charactersData = this.charactersList;
                this.render();
                console.log('[角色库] 已同步脚本中的角色:', response.data.summary);
            }
        } catch (error) {
            console.error('同步角色失败:', error);
        }
    },

    /**
     * 为单个角色生成参考图像
     */
    async generateImage(id) {
        const char = this.charactersList.find(c => c.id === id);
        if (!char) return;

        const name = char.name || '';
        const tags = Array.isArray(char.tags) ? char.tags : [];
        const description = char.description || '';
        const basePrompt = char.basePrompt || '';

        const promptParts = [
            basePrompt,
            description,
            tags.length ? `traits: ${tags.join(', ')}` : '',
            name ? `character: ${name}` : ''
        ].filter(Boolean);

        if (promptParts.length === 0) {
            alert('该角色缺少基础提示信息，无法生成参考图像。请先补充描述或标签。');
            return;
        }

        const fullPrompt = promptParts.join('. ');

        const apiKey = localStorage.getItem('gemini_api_key') || '';

        try {
            const response = await app.apiRequest('/image/generate', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: fullPrompt,
                    style: 'cel-shading',
                    aspectRatio: '1:1',
                    imageSize: '2K',
                    apiKey: apiKey || undefined
                })
            });

            if (!response.success || !response.data || !response.data.imageUrl) {
                alert('生成角色参考图失败，请稍后重试。');
                return;
            }

            const { imageUrl, isUrl } = response.data;

            // 更新本地状态
            char.imageUrl = imageUrl;
            char.imageIsUrl = isUrl || false;

            // 同步到后端存储
            try {
                await app.apiRequest(`/characters/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        imageUrl: char.imageUrl,
                        imageIsUrl: char.imageIsUrl
                    })
                });
            } catch (e) {
                console.warn('更新角色图像到服务器失败，但前端已显示图像:', e);
            }

            // 重新渲染
            this.render();
        } catch (error) {
            console.error('生成角色图像失败:', error);
            alert(`生成角色参考图失败: ${error.message}`);
        }
    },

    async deleteCharacter(id) {
        if (!confirm('确定要删除这个角色吗？')) {
            return;
        }

        try {
            const response = await app.apiRequest(`/characters/${id}`, {
                method: 'DELETE'
            });

            if (response.success) {
                await this.loadCharacters();
                this.render();
            }
        } catch (error) {
            alert(`删除角色失败: ${error.message}`);
        }
    },

    /**
     * 从角色库进入下一步：故事板分镜生成
     */
    goToStoryboard() {
        if (typeof app !== 'undefined') {
            app.navTo('storyboard');
            // 切换到故事板后，确保重新加载分镜数据
            setTimeout(() => {
                if (typeof storyboard !== 'undefined') {
                    storyboard.loadPanels();
                }
            }, 100);
        }
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    characters.init();
});

