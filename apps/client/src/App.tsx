import React from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { ScriptPage } from './pages/ScriptPage';
import { StoryboardPage } from './pages/StoryboardPage';
import { CharactersPage } from './pages/CharactersPage';
import { SettingsPage } from './pages/SettingsPage';

const navItems = [
  { path: '/', label: '概览', icon: '📊' },
  { path: '/script', label: '剧本中心', icon: '📝' },
  { path: '/characters', label: '角色库', icon: '👥' },
  { path: '/storyboard', label: '故事板', icon: '🎬' },
  { path: '/settings', label: '系统设置', icon: '⚙️' }
];

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-stone-50 text-stone-800">
      {/* Sidebar */}
      <aside className="w-64 border-r border-stone-200 bg-white hidden md:flex flex-col">
        <div className="p-6 border-b border-stone-100 space-y-2">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-3xl">🧶</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">StoryWeaver</h1>
              <p className="text-xs text-stone-500">智能分镜与漫画生成平台</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                [
                  'w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-stone-600 hover:bg-stone-50'
                ].join(' ')
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/script" element={<ScriptPage />} />
          <Route path="/storyboard" element={<StoryboardPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
};



