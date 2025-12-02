// 概览面板功能
const dashboard = {
    shotChartInstance: null,
    shelfKey: 'storyweaver_shelf',
    activeProjectKey: 'storyweaver_active_project',
    currentProject: null,
    featureCatalog: [
        { id: 'analysis', label: '剧本拆解 (Script Studio)' },
        { id: 'storyboard', label: '分镜画布 (Storyboard)' },
        { id: 'characters', label: '角色一致性 (Character Bank)' },
        { id: 'image', label: 'Gemini 3 图像生成' }
    ],

    init() {
        this.restoreActiveProject();
        this.renderBookshelf();
        this.updateProjectDetail(this.currentProject);
        this.renderCharts();
    },

    getShelf() {
        try {
            const raw = localStorage.getItem(this.shelfKey);
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            console.warn('解析书架数据失败，已重置。', error);
            localStorage.removeItem(this.shelfKey);
            return [];
        }
    },

    setShelf(data) {
        localStorage.setItem(this.shelfKey, JSON.stringify(data));
    },

    saveProjectToShelf(project) {
        const shelf = this.getShelf();
        const index = shelf.findIndex(item => item.id === project.id);
        if (index >= 0) {
            shelf[index] = project;
        } else {
            shelf.unshift(project);
        }
        this.setShelf(shelf);
        this.currentProject = project;
        localStorage.setItem(this.activeProjectKey, project.id);
        this.renderBookshelf();
        this.updateProjectDetail(project);
        this.renderCharts();
        if (typeof storyboard !== 'undefined') {
            window.storyboardData = project.analysis || null;
            storyboard.loadPanels();
        }
    },

    renderBookshelf() {
        const listEl = document.getElementById('bookshelf-list');
        const emptyEl = document.getElementById('bookshelf-empty');
        if (!listEl || !emptyEl) return;

        const shelf = this.getShelf();
        if (shelf.length === 0) {
            emptyEl.classList.remove('hidden');
            listEl.innerHTML = '';
            return;
        }

        emptyEl.classList.add('hidden');
        listEl.innerHTML = shelf.map(project => {
            const active = this.currentProject && this.currentProject.id === project.id;
            const panels = project.generatedPanels || project.totalPanels || 0;
            const updated = project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '刚保存';
            return `
                <div class="group border rounded-lg p-3 mb-2 ${active ? 'border-orange-500 bg-orange-50 text-orange-800 shadow-sm' : 'border-stone-200'}">
                    <button 
                        class="w-full text-left"
                        onclick="dashboard.selectProject('${project.id}')">
                        <div class="flex items-center justify-between">
                            <div class="font-semibold truncate">${project.name}</div>
                            <span class="text-xs text-stone-400">${panels} 镜头</span>
                        </div>
                        <p class="text-xs text-stone-400 mt-1 truncate">${project.tags?.join(' / ') || '未分类'}</p>
                        <p class="text-[11px] text-stone-300 mt-1">更新：${updated}</p>
                    </button>
                    <div class="mt-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                        <button 
                            class="px-2 py-1 rounded border border-stone-300 text-stone-600 hover:bg-stone-100"
                            onclick="event.stopPropagation(); dashboard.renameProject('${project.id}')">
                            重命名
                        </button>
                        <button 
                            class="px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
                            onclick="event.stopPropagation(); dashboard.deleteProject('${project.id}')">
                            删除
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    restoreActiveProject() {
        const shelf = this.getShelf();
        if (shelf.length === 0) {
            this.currentProject = null;
            return;
        }

        const activeId = localStorage.getItem(this.activeProjectKey);
        const found = shelf.find(item => item.id === activeId);
        this.currentProject = found || shelf[0];
        if (this.currentProject) {
            localStorage.setItem(this.activeProjectKey, this.currentProject.id);
            window.storyboardData = this.currentProject.analysis || null;
        }
    },

    selectProject(projectId) {
        const shelf = this.getShelf();
        const project = shelf.find(item => item.id === projectId);
        if (!project) return;

        this.currentProject = project;
        localStorage.setItem(this.activeProjectKey, project.id);
        window.storyboardData = project.analysis || null;
        if (typeof storyboard !== 'undefined') {
            storyboard.loadPanels();
        }
        this.updateProjectDetail(project);
        this.renderBookshelf();
        this.renderCharts();
    },

    updateProjectDetail(project) {
        const loglineEl = document.getElementById('project-logline');
        const updatedLabel = document.getElementById('project-updated-label');
        const panelsCountEl = document.getElementById('project-panels-count');
        const stageLabelEl = document.getElementById('project-stage-label');
        const stageNoteEl = document.getElementById('project-stage-note');

        if (!project) {
            if (loglineEl) loglineEl.textContent = '选择左侧书架中的剧本，即可查看项目详情和概览功能。';
            if (updatedLabel) updatedLabel.textContent = '最近更新：--';
            if (panelsCountEl) panelsCountEl.textContent = '0';
            if (stageLabelEl) stageLabelEl.textContent = '等待分析';
            if (stageNoteEl) stageNoteEl.textContent = '在剧本中心完成一次分析后，可解锁更多可视化。';
            if (typeof app !== 'undefined') {
                app.updateDashboard({
                    name: '尚未选择剧本',
                    tags: ['未分类'],
                    generatedPanels: 0,
                    totalPanels: 0
                });
            }
            this.refreshFeatureList([]);
            return;
        }

        if (loglineEl) {
            loglineEl.textContent = project.logline || project.theme || '该项目暂无描述，可在剧本中心补充。';
        }
        if (updatedLabel) {
            const updatedText = project.updatedAt ? new Date(project.updatedAt).toLocaleString() : '刚刚';
            updatedLabel.textContent = `最近更新：${updatedText}`;
        }
        if (panelsCountEl) {
            const count = project.generatedPanels ?? project.totalPanels ?? (project.analysis?.panels?.length || 0);
            panelsCountEl.textContent = count;
        }
        if (stageLabelEl) {
            stageLabelEl.textContent = project.stage || project.stats?.stage || 'Visual Prompter';
        }
        if (stageNoteEl) {
            const scenes = project.stats?.scenes || project.analysis?.structure?.length || '-';
            stageNoteEl.textContent = `结构段落：${scenes} / 分镜：${project.analysis?.panels?.length || 0}`;
        }

        if (typeof app !== 'undefined') {
            app.updateDashboard({
                name: project.name,
                tags: project.tags || ['未分类'],
                generatedPanels: project.generatedPanels || project.analysis?.panels?.length || 0,
                totalPanels: project.totalPanels || project.analysis?.panels?.length || 0
            });
        }

        this.refreshFeatureList(project.availableFeatures || []);
    },

    deleteProject(projectId) {
        const shelf = this.getShelf();
        const index = shelf.findIndex(item => item.id === projectId);
        if (index === -1) return;

        const target = shelf[index];
        if (!confirm(`确定要彻底删除项目「${target.name}」吗？\n\n将会同时清空该项目在概览和故事板中的分镜与统计。`)) {
            return;
        }

        shelf.splice(index, 1);
        this.setShelf(shelf);

        if (this.currentProject && this.currentProject.id === projectId) {
            this.currentProject = shelf[0] || null;
            if (this.currentProject) {
                localStorage.setItem(this.activeProjectKey, this.currentProject.id);
                window.storyboardData = this.currentProject.analysis || null;
            } else {
                localStorage.removeItem(this.activeProjectKey);
                window.storyboardData = null;
            }
        }

        // 清空故事板视图中的分镜
        if (!this.currentProject && typeof storyboard !== 'undefined') {
            storyboard.panels = [];
            storyboard.render();
        }

        this.renderBookshelf();
        this.updateProjectDetail(this.currentProject);
        this.renderCharts();
    },

    renameProject(projectId) {
        const shelf = this.getShelf();
        const idx = shelf.findIndex(item => item.id === projectId);
        if (idx === -1) return;

        const project = shelf[idx];
        const newName = prompt('修改项目标题：', project.name || '');
        if (!newName || !newName.trim()) return;

        const newTagsInput = prompt(
            '修改项目标签（逗号分隔）：',
            (project.tags || []).join(',')
        );

        const tags = newTagsInput
            ? newTagsInput
                  .split(/[,，]/)
                  .map(t => t.trim())
                  .filter(Boolean)
            : project.tags || [];

        const updated = {
            ...project,
            name: newName.trim(),
            tags,
            updatedAt: new Date().toISOString()
        };

        shelf[idx] = updated;
        this.setShelf(shelf);

        if (this.currentProject && this.currentProject.id === projectId) {
            this.currentProject = updated;
        }

        this.renderBookshelf();
        this.updateProjectDetail(this.currentProject);
    },

    refreshFeatureList(enabledFeatures) {
        const listEl = document.getElementById('overview-feature-list');
        const summaryEl = document.getElementById('project-feature-summary');
        if (!listEl || !summaryEl) return;

        const enabledCount = enabledFeatures.length;
        summaryEl.textContent = `${enabledCount}/${this.featureCatalog.length} 已启用`;

        listEl.innerHTML = this.featureCatalog.map(feature => {
            const active = enabledFeatures.includes(feature.id);
            return `
                <li class="flex items-center gap-2 ${active ? 'text-emerald-600' : 'text-stone-400'}">
                    <span class="w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-stone-200'}"></span>
                    ${feature.label}
                </li>
            `;
        }).join('');
    },

    renderCharts() {
        const ctx = document.getElementById('shotChart');
        if (!ctx) return;
        
        // 销毁现有图表
        if (this.shotChartInstance) {
            this.shotChartInstance.destroy();
        }

        // 从当前项目或临时故事板数据获取统计
        const panels = this.currentProject?.analysis?.panels || window.storyboardData?.panels || [];
        const distribution = this.calculateDistribution(panels);

        this.shotChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['特写 (Close-up)', '中景 (Mid)', '全景 (Wide)', '动作 (Action)'],
                datasets: [{
                    data: [
                        distribution['Close-up'] || 0,
                        distribution['Mid Shot'] || 0,
                        distribution['Wide Shot'] || 0,
                        distribution['Action'] || 0
                    ],
                    backgroundColor: [
                        '#3b82f6', // blue-500
                        '#a855f7', // purple-500
                        '#10b981', // emerald-500
                        '#f97316'  // orange-500
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            font: { family: "'Noto Sans SC', sans-serif" }
                        }
                    }
                }
            }
        });
    },

    calculateDistribution(panels) {
        const distribution = {
            'Close-up': 0,
            'Mid Shot': 0,
            'Wide Shot': 0,
            'Action': 0
        };

        panels.forEach(panel => {
            const type = panel.type || 'Mid Shot';
            if (distribution.hasOwnProperty(type)) {
                distribution[type]++;
            } else if (type.includes('Close') || type.includes('特写')) {
                distribution['Close-up']++;
            } else if (type.includes('Wide') || type.includes('全景')) {
                distribution['Wide Shot']++;
            } else if (type.includes('Action') || type.includes('动作')) {
                distribution['Action']++;
            } else {
                distribution['Mid Shot']++;
            }
        });

        return distribution;
    },

    animatePipeline(stage) {
        const stages = ['stage-1', 'stage-2', 'stage-3'];
        stages.forEach((id, index) => {
            const el = document.getElementById(id);
            if (el) {
                if (index < stage) {
                    el.classList.add('stage-processing');
                } else {
                    el.classList.remove('stage-processing');
                }
            }
        });
    }
};

