// 应用主入口 - 路由和状态管理
const app = {
    currentView: 'dashboard',
    apiBaseUrl: 'http://localhost:52300/api',
    theme: 'light',
    
    init() {
        console.log('StoryWeaver AI 初始化...');
        this.initTheme();
        this.processingSteps.init();
        this.navTo('dashboard');
        if (typeof dashboard !== 'undefined') {
            dashboard.init();
        }
        this.loadInitialData();
    },

    initTheme() {
        const stored = localStorage.getItem('storyweaver_theme');
        const initialTheme = stored || 'light';
        this.applyTheme(initialTheme);

        const toggles = document.querySelectorAll('[data-theme-toggle]');
        toggles.forEach(btn => {
            btn.addEventListener('click', () => this.toggleTheme());
        });
    },

    applyTheme(mode) {
        this.theme = mode;
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('storyweaver_theme', mode);
        this.updateThemeToggle();
    },

    toggleTheme() {
        this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
    },

    updateThemeToggle() {
        const icons = document.querySelectorAll('[data-theme-icon]');
        const labels = document.querySelectorAll('[data-theme-label]');

        icons.forEach(icon => {
            icon.textContent = this.theme === 'dark' ? '☀️' : '🌙';
        });

        labels.forEach(label => {
            label.textContent = this.theme === 'dark' ? '日间模式' : '夜间模式';
        });
    },

    async loadInitialData() {
        try {
            // 加载项目信息
            const projectRes = await fetch(`${this.apiBaseUrl}/projects`);
            const projectData = await projectRes.json();
            if (projectData.success && projectData.data.length > 0) {
                const project = projectData.data[0];
                this.updateDashboard(project);
            }

            // 加载角色列表
            const charRes = await fetch(`${this.apiBaseUrl}/characters`);
            const charData = await charRes.json();
            if (charData.success) {
                window.charactersData = charData.data;
                if (typeof characters !== 'undefined') {
                    characters.render();
                }
            }
        } catch (error) {
            console.error('加载初始数据失败:', error);
        }
    },

    updateDashboard(project) {
        const nameEl = document.getElementById('current-project-name');
        const tagsEl = document.getElementById('current-project-tags');
        const progressEl = document.getElementById('panel-progress');
        const progressBarEl = document.getElementById('panel-progress-bar');

        if (nameEl) nameEl.textContent = project.name;
        
        if (tagsEl) {
            const tags = Array.isArray(project.tags) && project.tags.length > 0 ? project.tags : ['未分类'];
            tagsEl.innerHTML = tags.map(tag => 
                `<span class="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">${tag}</span>`
            ).join('');
        }

        if (progressEl && progressBarEl) {
            const progress = project.totalPanels > 0 
                ? (project.generatedPanels / project.totalPanels * 100).toFixed(0)
                : 0;
            progressEl.innerHTML = `${project.generatedPanels}/${project.totalPanels} <span class="text-sm text-stone-400 font-normal">关键帧</span>`;
            progressBarEl.style.width = `${progress}%`;
        }
    },

    navTo(viewId) {
        // 隐藏所有视图
        const sections = ['dashboard', 'script', 'storyboard', 'characters', 'settings'];
        sections.forEach(id => {
            const el = document.getElementById(`view-${id}`);
            if (el) el.classList.add('hidden');
        });
        
        // 显示选中的视图
        const targetEl = document.getElementById(`view-${viewId}`);
        if (targetEl) {
            targetEl.classList.remove('hidden');
            this.currentView = viewId;
        }

        // 更新侧边栏激活状态
        const buttons = document.querySelectorAll('.nav-btn');
        buttons.forEach(btn => {
            btn.classList.remove('bg-orange-50', 'text-orange-700');
            btn.classList.add('text-stone-600', 'hover:bg-stone-50');
        });

        const indexMap = { 
            'dashboard': 0, 
            'script': 1, 
            'characters': 2, 
            'storyboard': 3, 
            'settings': 4 
        };
        
        if (buttons[indexMap[viewId]]) {
            buttons[indexMap[viewId]].classList.remove('text-stone-600', 'hover:bg-stone-50');
            buttons[indexMap[viewId]].classList.add('bg-orange-50', 'text-orange-700');
        }

        this.updateMobileNav(viewId);

        // 关闭移动端菜单
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) mobileMenu.classList.add('hidden');

        // 根据视图执行特定初始化
        if (viewId === 'dashboard' && typeof dashboard !== 'undefined') {
            dashboard.renderCharts();
        }
        
        // 当跳转到故事板时，重新加载分镜数据
        if (viewId === 'storyboard' && typeof storyboard !== 'undefined') {
            storyboard.loadPanels();
        }
    },

    updateMobileNav(viewId) {
        const tabs = document.querySelectorAll('.mobile-tab-btn');
        tabs.forEach(tab => {
            const isActive = tab.dataset.view === viewId;
            tab.classList.toggle('text-orange-600', isActive);
            tab.classList.toggle('font-semibold', isActive);
            tab.classList.toggle('text-stone-500', !isActive);
        });
    },

    async apiRequest(endpoint, options = {}) {
        try {
            const { disableAuth, ...fetchOptions } = options;
            const headers = {
                'Content-Type': 'application/json',
                ...(fetchOptions.headers || {})
            };

            if (!disableAuth) {
                const storedKey = localStorage.getItem('gemini_api_key');
                if (storedKey && !headers['X-API-Key'] && !headers['Authorization']) {
                    headers['X-API-Key'] = storedKey;
                }
            }

            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                ...fetchOptions,
                headers
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '请求失败');
            }

            return await response.json();
        } catch (error) {
            console.error('API 请求错误:', error);
            throw error;
        }
    },

    processingSteps: {
        panel: null,
        listEl: null,
        finalEl: null,
        timer: null,
        queue: [],
        history: [],

        init() {
            this.panel = document.getElementById('ai-processing-panel');
            this.listEl = document.getElementById('ai-processing-steps');
            this.finalEl = document.getElementById('ai-processing-final');
        },

        ensure() {
            if (!this.panel) {
                this.init();
            }
        },

        start(steps = []) {
            this.ensure();
            if (!this.panel) return;
            this.clear(true);
            this.panel.classList.remove('hidden');
            this.queue = [...steps];
            this.history = [];
            if (this.queue.length === 0) return;
            this.addLine(this.queue.shift());
            if (this.queue.length > 0) {
                this.timer = setInterval(() => {
                    if (!this.queue.length) {
                        this.stopTimer();
                        return;
                    }
                    this.addLine(this.queue.shift());
                }, 1800);
            }
        },

        addLine(text) {
            if (!this.listEl) return;
            this.history.push(text);
            const recent = this.history.slice(-5);
            this.listEl.innerHTML = recent.map((msg, idx) => {
                const isLatest = idx === recent.length - 1;
                return `<li class="${isLatest ? 'text-orange-500 dark:text-orange-300 font-semibold' : 'text-stone-500 dark:text-stone-400'}">${msg}</li>`;
            }).join('');
        },

        mark(text) {
            this.addLine(text);
        },

        finish(message, state = 'success') {
            this.stopTimer();
            if (!this.panel) return;
            this.addLine(message);
            if (this.finalEl) {
                this.finalEl.textContent = message;
                this.finalEl.className = state === 'error'
                    ? 'text-[11px] text-red-500'
                    : 'text-[11px] text-green-500';
            }
            setTimeout(() => this.hide(), 2200);
        },

        hide() {
            if (this.panel) {
                this.panel.classList.add('hidden');
            }
            if (this.listEl) {
                this.listEl.innerHTML = '';
            }
            if (this.finalEl) {
                this.finalEl.textContent = '';
                this.finalEl.className = 'text-[11px] text-stone-400 dark:text-stone-500';
            }
        },

        clear(skipHide = false) {
            this.stopTimer();
            this.history = [];
            if (this.listEl) this.listEl.innerHTML = '';
            if (this.finalEl) this.finalEl.textContent = '';
            if (!skipHide) this.hide();
        },

        stopTimer() {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
        }
    }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

