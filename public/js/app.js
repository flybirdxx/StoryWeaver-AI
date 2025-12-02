// 应用主入口 - 路由和状态管理
const app = {
    currentView: 'dashboard',
    apiBaseUrl: 'http://localhost:3000/api',
    
    init() {
        console.log('StoryWeaver AI 初始化...');
        this.navTo('dashboard');
        if (typeof dashboard !== 'undefined') {
            dashboard.init();
        }
        this.loadInitialData();
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

    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
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
    }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

