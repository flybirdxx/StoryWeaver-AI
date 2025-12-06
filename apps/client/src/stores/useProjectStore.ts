// Zustand Store：全局项目状态管理
// 用于管理分镜列表、项目列表等全局状态，替代 React hooks 的局部状态管理

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Panel, PanelStatus, Project } from '@storyweaver/shared';

export interface ProjectState {
  // 项目列表管理
  projects: Project[];
  currentProject: Project | null;
  currentProjectId: string | null;
  
  // 分镜管理
  panels: Panel[];
  selectedPanelId: string | number | null;
  
  // 项目操作方法
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, project: Partial<Project>) => void;
  removeProject: (projectId: string) => void;
  
  // 分镜操作方法
  setPanels: (panels: Panel[]) => void;
  updatePanelStatus: (id: string | number, status: PanelStatus, url?: string) => void;
  updatePanelImage: (id: string | number, imageUrl: string, isUrl?: boolean) => void;
  setCurrentProjectId: (id: string | null) => void;
  setSelectedPanelId: (id: string | number | null) => void;
  addPanel: (panel: Panel) => void;
  removePanel: (id: string | number) => void;
  reorderPanels: (startIndex: number, endIndex: number) => void;
  
  // Computed selectors (通过函数访问，避免在 store 中存储)
}

// Computed selectors - 用于从 store 中计算派生状态
// 这些是纯函数，可以在组件中直接使用，也可以作为 Zustand selector 使用

/**
 * 计算项目进度百分比
 */
export const selectProjectProgress = (state: ProjectState): number => {
  const { currentProject, panels } = state;
  if (!currentProject) return 0;
  const totalPanels = currentProject.totalPanels || panels.length || 0;
  const generatedPanels = currentProject.generatedPanels || 0;
  return totalPanels > 0 ? Math.round((generatedPanels / totalPanels) * 100) : 0;
};

/**
 * 获取 Pipeline 阶段状态
 */
export const selectPipelineStages = (state: ProjectState) => {
  const { currentProject } = state;
  const hasScript = Boolean(currentProject?.script && currentProject.script.trim().length > 0);
  const hasAnalysis = Boolean(
    currentProject?.analysis && 
    currentProject.analysis.panels && 
    Array.isArray(currentProject.analysis.panels) && 
    currentProject.analysis.panels.length > 0
  );
  const hasGeneratedPanels = Boolean(
    currentProject?.generatedPanels && 
    currentProject.generatedPanels > 0
  );
  
  return {
    stage1: hasScript,
    stage2: hasAnalysis,
    stage3: hasGeneratedPanels
  };
};

/**
 * 分镜完成度统计
 */
export const selectPanelCompletionStats = (state: ProjectState) => {
  const { panels } = state;
  const total = panels.length;
  const completed = panels.filter(p => p.status === 'completed').length;
  const generating = panels.filter(p => p.status === 'generating').length;
  const pending = panels.filter(p => !p.status || p.status === 'pending').length;
  
  return {
    total,
    completed,
    generating,
    pending,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
  };
};

export const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    // 初始状态
    projects: [],
    currentProject: null,
    currentProjectId: null,
    panels: [],
    selectedPanelId: null,
    
    // 项目操作方法
    setProjects: (projects: Project[]) => set({ projects }),
    setCurrentProject: (project: Project | null) => 
      set({ 
        currentProject: project,
        currentProjectId: project?.id || null
      }),
    addProject: (project: Project) =>
      set((state) => {
        const index = state.projects.findIndex((p) => p.id === project.id);
        if (index >= 0) {
          state.projects[index] = project;
        } else {
          state.projects.unshift(project);
        }
      }),
    updateProject: (projectId: string, updates: Partial<Project>) =>
      set((state) => {
        const index = state.projects.findIndex((p) => p.id === projectId);
        if (index >= 0) {
          state.projects[index] = { ...state.projects[index], ...updates };
          // 如果更新的是当前项目，同步更新
          if (state.currentProject?.id === projectId) {
            state.currentProject = { ...state.currentProject, ...updates };
          }
        }
      }),
    removeProject: (projectId: string) =>
      set((state) => {
        state.projects = state.projects.filter((p) => p.id !== projectId);
        // 如果删除的是当前项目，切换到第一个项目或清空
        if (state.currentProject?.id === projectId) {
          state.currentProject = state.projects[0] || null;
          state.currentProjectId = state.currentProject?.id || null;
        }
      }),
    
    // 分镜操作方法
    setPanels: (panels: Panel[]) => set((state) => {
      // 智能合并：保留已有面板的图像数据
      const merged = panels.map((newPanel) => {
        const existing = state.panels.find(p => p.id === newPanel.id);
        // 如果已有面板有图像，保留它
        if (existing?.imageUrl && !newPanel.imageUrl) {
          return {
            ...newPanel,
            imageUrl: existing.imageUrl,
            imageIsUrl: existing.imageIsUrl,
            status: existing.status || newPanel.status
          };
        }
        return newPanel;
      });
      state.panels = merged;
      // 同步更新 window.storyboardData
      if ((window as any).storyboardData) {
        (window as any).storyboardData.panels = merged;
      }
    }),
    updatePanelStatus: (id: string | number, status: PanelStatus, url?: string) =>
      set((state) => {
        const panel = state.panels.find((p: Panel) => p.id === id);
        if (panel) {
          panel.status = status;
          if (url) panel.imageUrl = url;
        }
      }),
    updatePanelImage: (id: string | number, imageUrl: string, isUrl = false) =>
      set((state) => {
        const panel = state.panels.find((p: Panel) => p.id === id);
        if (panel) {
          panel.imageUrl = imageUrl;
          panel.imageIsUrl = isUrl;
          panel.status = 'completed';
        }
      }),
    setCurrentProjectId: (id: string | null) => {
      set((state) => {
        state.currentProjectId = id;
        // 同步更新 currentProject
        if (id) {
          const project = state.projects.find((p) => p.id === id);
          state.currentProject = project || null;
        } else {
          state.currentProject = null;
        }
      });
    },
    setSelectedPanelId: (id: string | number | null) => set({ selectedPanelId: id }),
    addPanel: (panel: Panel) =>
      set((state) => {
        state.panels.push(panel);
      }),
    removePanel: (id: string | number) =>
      set((state) => {
        state.panels = state.panels.filter((p: Panel) => p.id !== id);
      }),
    reorderPanels: (startIndex: number, endIndex: number) =>
      set((state) => {
        const result = Array.from(state.panels);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        // 更新panelIndex
        result.forEach((panel, index) => {
          panel.panelIndex = index;
        });
        state.panels = result;
      })
  }))
);

