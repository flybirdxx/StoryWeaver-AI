import React, { useEffect } from 'react';
import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';

/**
 * ProjectLayout - 项目工作台布局
 * 这是 L2 项目层的主布局，包含侧边栏和顶部导航。
 * 只有进入具体的项目后，用户才会看到这个界面。
 */
export const ProjectLayout: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { selectProject, currentProject } = useDashboard();
  
  // 当 URL 中的 projectId 变化时，自动加载对应的项目数据
  useEffect(() => {
    if (projectId) {
      selectProject(projectId);
    } else {
      navigate('/'); // 如果没有 ID，退回到书架
    }
  }, [projectId, selectProject, navigate]);

  // 判断是否解锁后续功能
  // 规则：只有当剧本被分析过（有 panels 数据）时，才解锁角色库和故事板
  const isAnalysisDone = Boolean(
    (currentProject?.generatedPanels && currentProject.generatedPanels > 0) || 
    (currentProject?.analysis?.panels?.length && currentProject.analysis.panels.length > 0)
  );

  const navItems = [
    { path: 'dashboard', label: '概览', icon: '📊', locked: false },
    { path: 'script', label: '剧本中心', icon: '📝', locked: false },
    { path: 'characters', label: '角色库', icon: '👥', locked: !isAnalysisDone },
    { path: 'storyboard', label: '故事板', icon: '🎬', locked: !isAnalysisDone },
  ];

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.locked) {
      e.preventDefault();
      alert('🔒 请先在「剧本中心」完成 AI 导演分析，才能解锁角色库和故事板。');
    }
  };

  return (
    <div className="min-h-screen flex bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-100 transition-colors duration-300">
      {/* Sidebar - 仅在项目内显示 */}
      <aside className="w-64 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hidden md:flex flex-col flex-shrink-0 z-20">
        {/* Sidebar Header: 返回书架 */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-stone-500 hover:text-orange-600 transition-colors text-sm font-medium mb-4"
          >
            ← 返回书架
          </button>
          <div className="flex items-center gap-2 px-2">
            <span className="text-2xl">🧶</span>
            <div className="overflow-hidden">
              <h1 className="text-base font-bold tracking-tight truncate" title={currentProject?.name}>
                {currentProject?.name || '加载中...'}
              </h1>
              <p className="text-[10px] text-stone-400 truncate">
                {currentProject?.id || ''}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={(e) => handleNavClick(e, item)}
              className={({ isActive }) =>
                `group flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 shadow-sm' 
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                }
                ${item.locked ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                `
              }
            >
              <div className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.locked && <span className="text-xs">🔒</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer: Model Status */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-800">
          <div className="bg-stone-100 dark:bg-stone-800/50 rounded-lg p-3 text-[10px] text-stone-500 dark:text-stone-400">
            <div className="flex justify-between mb-1">
              <span>AI Status:</span>
              <span className="text-green-500">● Online</span>
            </div>
            <div>Model: Gemini 3 Pro</div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white dark:bg-stone-900 border-b z-50 p-4 flex justify-between items-center">
        <button onClick={() => navigate('/')}>←</button>
        <span className="font-bold">{currentProject?.name || '项目'}</span>
        <button>☰</button>
      </div>

      {/* Main Content Outlet */}
      <main className="flex-1 overflow-hidden relative flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 md:pt-8 scroll-smooth">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

