import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectLayout } from './layouts/ProjectLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ScriptPage } from './pages/ScriptPage';
import { StoryboardPage } from './pages/StoryboardPage';
import { CharactersPage } from './pages/CharactersPage';
import { SettingsPage } from './pages/SettingsPage';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * App Router Configuration
 * 路由结构重构说明 (v2):
 * 1. `/` (Home) -> ProjectsPage (书架)
 * 2. `/settings` -> SettingsPage (全局设置，提升至 L1)
 * 3. `/project/:projectId` -> ProjectLayout (项目工作台)
 */
export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Level 1: 全局书架 */}
        <Route path="/" element={<ProjectsPage />} />
        
        {/* Level 1: 全局设置 (从项目内移出) */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* Level 2: 项目工作台 (带侧边栏的 Layout) */}
        <Route path="/project/:projectId" element={<ProjectLayout />}>
          {/* 默认重定向到概览 */}
          <Route index element={<Navigate to="dashboard" replace />} />
          
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="script" element={<ScriptPage />} />
          <Route path="storyboard" element={<StoryboardPage />} />
          <Route path="characters" element={<CharactersPage />} />
        </Route>

        {/* 捕获未知路由，重回首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
};



