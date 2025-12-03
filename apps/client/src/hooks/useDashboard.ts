import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../stores/useProjectStore';
import type { Project } from '@storyweaver/shared';

interface UseDashboardReturn {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  loadProjects: () => Promise<void>;
  selectProject: (projectId: string) => void;
  saveProjectToShelf: (project: Project) => void;
  deleteProject: (projectId: string) => Promise<void>;
  renameProject: (projectId: string, newName: string, newTags: string[]) => Promise<void>;
  calculateDistribution: (panels: any[]) => Record<string, number>;
}

const SHELF_KEY = 'storyweaver_shelf';
const ACTIVE_PROJECT_KEY = 'storyweaver_active_project';

export function useDashboard(): UseDashboardReturn {
  // 使用 Zustand Store 管理全局状态
  const projects = useProjectStore((state) => state.projects);
  const currentProject = useProjectStore((state) => state.currentProject);
  const setProjects = useProjectStore((state) => state.setProjects);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const addProject = useProjectStore((state) => state.addProject);
  const updateProject = useProjectStore((state) => state.updateProject);
  const removeProject = useProjectStore((state) => state.removeProject);
  
  // UI 状态保持局部
  const [isLoading, setIsLoading] = useState(false);

  const getShelf = useCallback((): Project[] => {
    try {
      const raw = localStorage.getItem(SHELF_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn('解析书架数据失败，已重置。', error);
      localStorage.removeItem(SHELF_KEY);
      return [];
    }
  }, []);

  const setShelf = useCallback((data: Project[]) => {
    localStorage.setItem(SHELF_KEY, JSON.stringify(data));
  }, []);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      // 先从 localStorage 加载书架
      const shelf = getShelf();
      setProjects(shelf);

      // 如果有书架数据，恢复当前项目
      if (shelf.length > 0) {
        const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
        const found = shelf.find((item: Project) => item.id === activeId);
        const project = found || shelf[0];
        setCurrentProject(project);
        localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
        (window as any).storyboardData = project.analysis || null;
      } else {
        setCurrentProject(null);
      }

      // 可选：从后端 API 同步项目列表
      // const response = await apiRequest<Project[]>('/projects');
      // if (response.success && response.data) {
      //   // 合并本地和远程数据
      // }
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getShelf, setProjects, setCurrentProject]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const selectProject = useCallback((projectId: string) => {
    const project = projects.find((item: Project) => item.id === projectId);
    if (!project) {
      // 如果 Store 中没有，尝试从 localStorage 加载
      const shelf = getShelf();
      const found = shelf.find((item: Project) => item.id === projectId);
      if (found) {
        setCurrentProject(found);
        localStorage.setItem(ACTIVE_PROJECT_KEY, found.id);
        (window as any).storyboardData = found.analysis || null;
      }
      return;
    }

    setCurrentProject(project);
    localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
    (window as any).storyboardData = project.analysis || null;
  }, [projects, getShelf, setCurrentProject]);

  const saveProjectToShelf = useCallback((project: Project) => {
    // 更新 Store
    addProject(project);
    setCurrentProject(project);
    
    // 同步到 localStorage（向后兼容）
    const shelf = getShelf();
    const index = shelf.findIndex((item: Project) => item.id === project.id);
    if (index >= 0) {
      shelf[index] = project;
    } else {
      shelf.unshift(project);
    }
    setShelf(shelf);
    localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
  }, [getShelf, setShelf, addProject, setCurrentProject]);

  const deleteProject = useCallback(async (projectId: string) => {
    if (!confirm('确定要彻底删除这个项目吗？\n\n将会同时清空该项目在概览和故事板中的分镜与统计。')) {
      return;
    }

    // 更新 Store
    removeProject(projectId);

    // 同步到 localStorage（向后兼容）
    const shelf = getShelf();
    const index = shelf.findIndex((item: Project) => item.id === projectId);
    if (index === -1) return;

    shelf.splice(index, 1);
    setShelf(shelf);

    // 如果删除的是当前项目，Store 会自动处理切换
    const newCurrent = projects.find((p) => p.id !== projectId) || null;
    if (currentProject && currentProject.id === projectId) {
      if (newCurrent) {
        setCurrentProject(newCurrent);
        localStorage.setItem(ACTIVE_PROJECT_KEY, newCurrent.id);
        (window as any).storyboardData = newCurrent.analysis || null;
      } else {
        setCurrentProject(null);
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
        (window as any).storyboardData = null;
      }
    }
  }, [currentProject, projects, getShelf, setShelf, removeProject, setCurrentProject]);

  const renameProject = useCallback(async (projectId: string, newName: string, newTags: string[]) => {
    const updates = {
      name: newName.trim(),
      tags: newTags,
      updatedAt: new Date().toISOString()
    };

    // 更新 Store
    updateProject(projectId, updates);

    // 同步到 localStorage（向后兼容）
    const shelf = getShelf();
    const index = shelf.findIndex((item: Project) => item.id === projectId);
    if (index === -1) return;

    const updated = {
      ...shelf[index],
      ...updates
    };

    shelf[index] = updated;
    setShelf(shelf);
  }, [getShelf, setShelf, updateProject]);

  const calculateDistribution = useCallback((panels: any[]): Record<string, number> => {
    const distribution: Record<string, number> = {
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
  }, []);

  return {
    projects,
    currentProject,
    isLoading,
    loadProjects,
    selectProject,
    saveProjectToShelf,
    deleteProject,
    renameProject,
    calculateDistribution
  };
}

