import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Edit2, Film, Users, TrendingUp } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useProjectStore, selectProjectProgress } from '../stores/useProjectStore';
import { PipelineMonitor } from '../components/dashboard/PipelineMonitor';
import { QuickActions } from '../components/dashboard/QuickActions';
import { TaskCenter } from '../components/dashboard/TaskCenter';
import { ProjectCharacters } from '../components/dashboard/ProjectCharacters';

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

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameForm, setRenameForm] = useState({ name: '', tags: '' });

  // 准备图表数据
  const projectPanels = currentProject?.analysis?.panels || (window as any).storyboardData?.panels || [];
  const distribution = calculateDistribution(projectPanels);
  
  const chartData = [
    { name: '特写', value: distribution['Close-up'] || 0, color: '#3b82f6' },
    { name: '中景', value: distribution['Mid Shot'] || 0, color: '#a855f7' },
    { name: '全景', value: distribution['Wide Shot'] || 0, color: '#10b981' },
    { name: '动作', value: distribution['Action'] || 0, color: '#f97316' },
  ].filter(item => item.value > 0);
  
  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

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

  const generatedPanels = currentProject?.generatedPanels || 0;
  const totalPanels = currentProject?.totalPanels || projectPanels.length;
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">项目控制台</h2>
          <p className="text-stone-500 dark:text-stone-400 mt-1">概览数据与创作进度</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openRename}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-orange-600 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          修改项目信息
        </motion.button>
      </header>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-stone-900 p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <Film className="w-4 h-4" />
            当前项目
          </div>
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-stone-900 p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            生成进度
          </div>
          <div className="text-2xl font-black text-orange-500">{generatedPanels}/{totalPanels}</div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <motion.div 
              className="bg-orange-500 h-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-stone-900 p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <Film className="w-4 h-4" />
            分镜总数
          </div>
          <div className="text-2xl font-black text-stone-800 dark:text-stone-100">{projectPanels.length}</div>
          <div className="text-xs text-stone-400 mt-1">
            Stage: {currentProject.stats?.stage || 'Scripting'}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-stone-900 p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <Users className="w-4 h-4" />
            主要角色
          </div>
          <ProjectCharacters project={currentProject} maxVisible={3} />
        </motion.div>
      </div>

      {/* Middle Section: Pipeline & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PipelineMonitor project={currentProject} />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800"
        >
          <h3 className="text-sm font-bold mb-4 text-stone-700 dark:text-stone-200">镜头节奏分布</h3>
          {chartData.length > 0 ? (
            <div className="h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} 个`, '数量']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => value}
                  />
                </PieChart>
              </ResponsiveContainer>
              {totalValue > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-stone-800 dark:text-stone-100">{totalValue}</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">个分镜</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-stone-400 text-sm">
              暂无数据
            </div>
          )}
        </motion.div>
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
    </motion.div>
  );
};
