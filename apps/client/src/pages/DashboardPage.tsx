import React, { useEffect, useRef, useState } from 'react';
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

/**
 * DashboardPage - 项目内部概览
 * 修改说明：移除了左侧的"书架"列表，因为现在书架是首页 (ProjectsPage)。
 * 此页面现在专注于展示"当前项目"的数据统计。
 */
export const DashboardPage: React.FC = () => {
  const {
    currentProject,
    renameProject,
    calculateDistribution
  } = useDashboard();

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameForm, setRenameForm] = useState({ name: '', tags: '' });


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

  const openRename = () => {
    if (!currentProject) return;
    setRenameForm({ 
      name: currentProject.name || '', 
      tags: (currentProject.tags || []).join(', ') 
    });
    setShowRenameModal(true);
  };

  const handleRenameSubmit = async () => {
    if (!currentProject) return;
    const tags = renameForm.tags
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(Boolean);
    await renameProject(currentProject.id, renameForm.name, tags);
    setShowRenameModal(false);
  };

  const panels = currentProject?.analysis?.panels || [];
  const generatedPanels = currentProject?.generatedPanels || 0;
  const totalPanels = currentProject?.totalPanels || panels.length;
  const progress = useProjectStore(selectProjectProgress);

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-stone-500 dark:text-stone-400">加载项目数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">项目控制台</h2>
          <p className="text-stone-500 dark:text-stone-400 mt-1">概览数据与创作进度</p>
        </div>
        <button 
          onClick={openRename}
          className="text-sm text-stone-500 hover:text-orange-600 underline"
        >
          修改项目信息
        </button>
      </header>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-xs text-stone-500 mb-1">当前项目</div>
          <div className="text-lg font-bold truncate" title={currentProject.name}>
            {currentProject.name}
          </div>
          <div className="flex gap-1 mt-2">
            {(currentProject.tags || []).slice(0, 2).map(tag => (
              <span 
                key={tag} 
                className="text-[10px] bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-stone-500"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-xs text-stone-500 mb-1">生成进度</div>
          <div className="text-2xl font-black text-orange-500">{generatedPanels}/{totalPanels}</div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-orange-500 h-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-xs text-stone-500 mb-1">分镜总数</div>
          <div className="text-2xl font-black text-stone-800 dark:text-stone-100">{panels.length}</div>
          <div className="text-xs text-stone-400 mt-1">
            Stage: {currentProject.stats?.stage || 'Scripting'}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-xs text-stone-500 mb-1">主要角色</div>
          <ProjectCharacters project={currentProject} maxVisible={3} />
        </div>
      </div>

      {/* Middle Section: Pipeline & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PipelineMonitor project={currentProject} />
        </div>
        <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
          <h3 className="text-sm font-bold mb-4 text-stone-700 dark:text-stone-200">镜头节奏分布</h3>
          <div className="chart-container h-[200px]">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Bottom Section: Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions />
        <TaskCenter />
      </div>

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-xl p-6 max-w-md w-full border border-stone-200 dark:border-stone-700">
            <h3 className="text-xl font-bold mb-4">修改项目信息</h3>
            <div className="space-y-4">
              <input 
                className="w-full p-2 border rounded bg-transparent"
                value={renameForm.name}
                onChange={e => setRenameForm({...renameForm, name: e.target.value})}
                placeholder="项目名称"
              />
              <input 
                className="w-full p-2 border rounded bg-transparent"
                value={renameForm.tags}
                onChange={e => setRenameForm({...renameForm, tags: e.target.value})}
                placeholder="标签 (逗号分隔)"
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setShowRenameModal(false)} 
                  className="px-4 py-2 text-stone-500"
                >
                  取消
                </button>
                <button 
                  onClick={handleRenameSubmit} 
                  className="px-4 py-2 bg-orange-600 text-white rounded"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
