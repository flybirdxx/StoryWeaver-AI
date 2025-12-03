# 已归档的旧代码

本文档记录已迁移到新架构的旧代码文件。

## 前端代码迁移

以下文件已由 React + TypeScript 版本替代：

### public/js/ 目录（已迁移到 apps/client/src/）
- `app.js` → `apps/client/src/App.tsx`
- `dashboard.js` → `apps/client/src/pages/DashboardPage.tsx` + `apps/client/src/hooks/useDashboard.ts`
- `scriptStudio.js` → `apps/client/src/pages/ScriptPage.tsx` + `apps/client/src/hooks/useScriptStudio.ts`
- `characters.js` → `apps/client/src/pages/CharactersPage.tsx` + `apps/client/src/hooks/useCharacters.ts`
- `storyboard.js` → `apps/client/src/pages/StoryboardPage.tsx` + `apps/client/src/hooks/useStoryboard.ts`
- `settings.js` → `apps/client/src/pages/SettingsPage.tsx` + `apps/client/src/hooks/useSettings.ts`

### public/index.html（已迁移到 apps/client/index.html）
旧的 HTML 入口文件已由 React SPA 替代。

## 后端代码迁移

以下文件已由 TypeScript 版本替代：

### server/routes/ 目录（已迁移到 apps/server/src/routes/）
- `project.js` → `apps/server/src/routes/project.ts`
- `character.js` → `apps/server/src/routes/character.ts`
- `script.js` → `apps/server/src/routes/script.ts`
- `image.js` → `apps/server/src/routes/image.ts`
- `settings.js` → `apps/server/src/routes/settings.ts`

### server/db.js（已迁移到 apps/server/src/db/）
- `db.js` → `apps/server/src/db/schema.ts` + `apps/server/src/db/client.ts` + `apps/server/src/db/*Repo.ts`

## 迁移完成时间

- Phase 1-3: 已完成（2024）
- Phase 4: 清理与交付（进行中）

## 注意事项

⚠️ **不要直接删除旧代码**，先确保新版本完全稳定后再清理。

旧代码保留在 `server/` 和 `public/` 目录中作为备份，直到新版本完全验证通过。

