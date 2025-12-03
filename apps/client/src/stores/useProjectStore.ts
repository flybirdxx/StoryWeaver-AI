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
}

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
    setPanels: (panels: Panel[]) => set({ panels }),
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

