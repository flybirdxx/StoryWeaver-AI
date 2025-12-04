import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useProjectStore, selectProjectProgress } from '../stores/useProjectStore';
import { PipelineMonitor } from '../components/dashboard/PipelineMonitor';
import { QuickActions } from '../components/dashboard/QuickActions';
import { TaskCenter } from '../components/dashboard/TaskCenter';
import { ProjectCharacters } from '../components/dashboard/ProjectCharacters';
import type { Project } from '@storyweaver/shared';

// Chart.js 类型声明（如果未安装 @types/chart.js）
declare global {
  interface Window {
    Chart: any;
  }
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    currentProject,
    isLoading,
    selectProject,
    deleteProject,
    renameProject,
    calculateDistribution
  } = useDashboard();

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [showRenameModal, setShowRenameModal] = useState<{ projectId: string; name: string; tags: string[] } | null>(null);
  const [renameForm, setRenameForm] = useState({ name: '', tags: '' });

  const featureCatalog = [
    { id: 'analysis', label: '剧本拆解 (Script Studio)' },
    { id: 'storyboard', label: '分镜画布 (Storyboard)' },
    { id: 'characters', label: '角色一致性 (Character Bank)' },
    { id: 'image', label: 'Gemini 3 图像生成' }
  ];

  // 渲染图表
  useEffect(() => {
    if (!chartRef.current || !window.Chart) return;

    const panels = currentProject?.analysis?.panels || (window as any).storyboardData?.panels || [];
    const distribution = calculateDistribution(panels);

    // 销毁现有图表
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new window.Chart(chartRef.current, {
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

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [currentProject, calculateDistribution]);

  const handleRename = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    setRenameForm({
      name: project.name,
      tags: (project.tags || []).join(', ')
    });
    setShowRenameModal({ projectId, name: project.name, tags: project.tags || [] });
  };

  const handleRenameSubmit = async () => {
    if (!showRenameModal) return;
    const tags = renameForm.tags
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(Boolean);
    await renameProject(showRenameModal.projectId, renameForm.name, tags);
    setShowRenameModal(null);
  };

  const panels = currentProject?.analysis?.panels || [];
  const generatedPanels = currentProject?.generatedPanels || currentProject?.totalPanels || panels.length;
  const totalPanels = currentProject?.totalPanels || panels.length;
  // 使用 computed selector 计算进度
  const progress = useProjectStore(selectProjectProgress);

  return (
    <section className="space-y-6">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">创作概览</h2>
        <p className="text-stone-500 dark:text-stone-400 mt-2">欢迎回来，导演。这里是您的项目控制中心。</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Bookshelf */}
        <aside className="xl:col-span-1 space-y-4">
          <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800 h-full flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">书架</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">保存的剧本项目</p>
              </div>
              <button
                onClick={() => navigate('/script')}
                className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400"
              >
                + 新剧本
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="text-sm text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 border border-dashed border-stone-200 dark:border-stone-700 rounded-lg p-4 text-center">
                还没有保存的剧本。请在剧本中心分析后，点击"保存到书架"。
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isActive={currentProject?.id === project.id}
                    onSelect={() => selectProject(project.id)}
                    onRename={() => handleRename(project.id)}
                    onDelete={() => deleteProject(project.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Project Overview */}
        <div className="xl:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Project */}
            <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm text-stone-500 dark:text-stone-400 mb-1">当前项目</div>
                  <div className="text-2xl font-bold text-stone-800 dark:text-stone-100">
                    {currentProject?.name || '尚未选择剧本'}
                  </div>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
                    {currentProject?.logline || currentProject?.theme || '选择左侧书架中的剧本，即可查看项目详情和概览功能。'}
                  </p>
                  {currentProject?.tags && currentProject.tags.length > 0 && (
                    <div className="mt-4 flex gap-2 flex-wrap">
                      {currentProject.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <ProjectCharacters project={currentProject} maxVisible={5} />
                </div>
                <div className="text-xs text-stone-400 dark:text-stone-500 text-right">
                  最近更新：{currentProject?.updatedAt ? new Date(currentProject.updatedAt).toLocaleString() : '--'}
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400 mb-1">概览支持的功能</div>
                  <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">Pipeline Access</h3>
                </div>
                <span className="text-xs text-stone-400 dark:text-stone-500">
                  {(currentProject?.availableFeatures || []).length}/{featureCatalog.length} 已启用
                </span>
              </div>
              <ul className="space-y-2 text-sm">
                {featureCatalog.map((feature) => {
                  const active = (currentProject?.availableFeatures || []).includes(feature.id);
                  return (
                    <li
                      key={feature.id}
                      className={`flex items-center gap-2 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500'}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-stone-700'}`}></span>
                      {feature.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Panel Progress */}
            <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800 transition-colors">
              <div className="text-sm text-stone-500 dark:text-stone-400 mb-1">分镜生成进度</div>
              <div className="text-4xl font-black tracking-tight text-orange-500">
                {generatedPanels}/{totalPanels} <span className="text-sm text-stone-400 font-normal">关键帧</span>
              </div>
              <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-orange-500 h-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Project Rhythm */}
            <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800 transition-colors">
              <div className="text-sm text-stone-500 dark:text-stone-400 mb-1">项目节奏</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-stone-400 dark:text-stone-500">分镜数量</div>
                  <div className="text-3xl font-black text-stone-800 dark:text-stone-100">{panels.length}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-stone-400 dark:text-stone-500">阶段</div>
                  <div className="text-2xl font-black text-stone-800 dark:text-stone-100">
                    {currentProject?.stats?.stage || currentProject?.stage || '等待分析'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-4">
                {currentProject
                  ? `结构段落：${currentProject.stats?.scenes || currentProject.analysis?.structure?.length || '-'} / 分镜：${panels.length}`
                  : '在剧本中心完成一次分析后，可解锁更多可视化。'}
              </p>
            </div>

            {/* API Token Usage */}
            <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800 transition-colors">
              <div className="text-sm text-stone-500 dark:text-stone-400 mb-1">API Token 消耗</div>
              <div className="text-4xl font-black text-stone-800 dark:text-stone-100">
                12,450 <span className="text-sm text-stone-400 font-normal">Tokens</span>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-4">重置日期: 2025-12-01</p>
            </div>
          </div>

          {/* Pipeline Visualizer & Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LLM Pipeline Visualizer */}
            <PipelineMonitor project={currentProject} />

            {/* Shot Distribution Chart */}
            <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800 transition-colors">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">镜头类型分布</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">分析当前剧本的视觉节奏</p>
              <div className="chart-container" style={{ height: '200px' }}>
                <canvas ref={chartRef}></canvas>
              </div>
            </div>
          </div>

          {/* Quick Actions & Task Center */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuickActions />
            <TaskCenter maxVisible={5} />
          </div>
        </div>
      </div>

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-stone-900 rounded-xl p-6 max-w-md w-full mx-4 border border-stone-200 dark:border-stone-700">
            <h3 className="text-xl font-bold mb-4 text-stone-800 dark:text-stone-100">修改项目</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">项目标题</label>
                <input
                  type="text"
                  value={renameForm.name}
                  onChange={(e) => setRenameForm({ ...renameForm, name: e.target.value })}
                  className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">项目标签（逗号分隔）</label>
                <input
                  type="text"
                  value={renameForm.tags}
                  onChange={(e) => setRenameForm({ ...renameForm, tags: e.target.value })}
                  className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRenameModal(null)}
                  className="px-4 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleRenameSubmit}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

interface ProjectCardProps {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, isActive, onSelect, onRename, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const panels = project.generatedPanels || project.totalPanels || 0;
  const updated = project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '刚保存';

  return (
    <div
      className={`group border rounded-lg p-3 mb-2 transition-all ${
        isActive
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 shadow-sm'
          : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <button className="w-full text-left" onClick={onSelect}>
        <div className="flex items-center justify-between">
          <div className="font-semibold truncate">{project.name}</div>
          <span className="text-xs text-stone-400 dark:text-stone-500">{panels} 镜头</span>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 truncate">
          {project.tags?.join(' / ') || '未分类'}
        </p>
        <p className="text-[11px] text-stone-300 dark:text-stone-600 mt-1">更新：{updated}</p>
      </button>
      <div
        className={`mt-2 flex justify-end gap-2 transition-opacity text-xs ${
          showActions ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          重命名
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="px-2 py-1 rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          删除
        </button>
      </div>
    </div>
  );
};
