import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { Button } from '../components/Button';
import { ProjectCharacters } from '../components/dashboard/ProjectCharacters';
import type { Project } from '@storyweaver/shared';

/**
 * ProjectsPage - 书架页面
 * 应用的首页，用户在这里管理所有项目
 */
export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, deleteProject, saveProjectToShelf } = useDashboard();

  const handleCreateNew = () => {
    const draftId = `proj-${Date.now()}`;
    const draftProject: Project = {
      id: draftId,
      name: '未命名剧本',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ['草稿'],
      totalPanels: 0,
      generatedPanels: 0,
    };
    
    saveProjectToShelf(draftProject);
    navigate(`/project/${draftId}/script`);
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}/dashboard`);
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个项目吗？此操作无法撤销。')) {
      deleteProject(projectId);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-100 p-8 overflow-y-auto transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3 text-stone-800 dark:text-stone-50">
              <span className="text-5xl">🧶</span> StoryWeaver AI
            </h1>
            <p className="text-stone-500 dark:text-stone-400 mt-2 text-lg">
              您的创意书架。选择一本开始创作，或编织一个新的故事。
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-all shadow-sm"
            >
              <span>⚙️</span>
              <span className="font-medium">系统设置</span>
            </button>
          </div>
        </header>

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold border-l-4 border-orange-500 pl-3">
            我的剧本 ({projects.length})
          </h2>
          <Button 
            onClick={handleCreateNew}
            className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            size="lg"
          >
            + 开始新创作
          </Button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-stone-300 dark:border-stone-800 rounded-2xl bg-stone-50 dark:bg-stone-900/50">
            <div className="text-6xl mb-6 opacity-20">📚</div>
            <h3 className="text-xl font-semibold text-stone-600 dark:text-stone-300 mb-2">
              书架是空的
            </h3>
            <p className="text-stone-400 max-w-md text-center mb-8">
              看起来您还没有任何项目。点击上方的按钮，让 AI 导演帮您把第一个点子变成视觉大片。
            </p>
            <div className="flex gap-4">
              <Button onClick={handleCreateNew}>创建第一个剧本</Button>
              <button 
                onClick={() => navigate('/settings')}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                配置 API Key
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className="group bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-xl hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 cursor-pointer flex flex-col h-[280px] relative overflow-hidden"
              >
                {/* Decorative Top Bar */}
                <div className="h-2 bg-gradient-to-r from-orange-400 to-red-500 w-full"></div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 flex-wrap">
                      {(project.tags || ['未分类']).slice(0, 2).map(tag => (
                        <span 
                          key={tag} 
                          className="text-[10px] px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-500 dark:text-stone-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button 
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="text-stone-300 hover:text-red-500 transition-colors p-1"
                      title="删除项目"
                    >
                      🗑️
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2 line-clamp-1 group-hover:text-orange-600 transition-colors">
                    {project.name}
                  </h3>
                  
                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-3 mb-4 flex-1">
                    {project.logline || project.theme || "暂无简介..."}
                  </p>

                  <div className="mt-auto">
                    <ProjectCharacters project={project} maxVisible={4} />
                  </div>
                </div>

                {/* Footer Stats */}
                <div className="bg-stone-50 dark:bg-stone-950/50 p-4 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-xs text-stone-500">
                  <span>
                    {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '刚刚'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={project.generatedPanels && project.generatedPanels > 0 ? "text-green-600 font-medium" : "text-stone-400"}>
                      {project.generatedPanels || 0} 镜头
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

