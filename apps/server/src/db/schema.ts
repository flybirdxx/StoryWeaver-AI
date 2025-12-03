// Phase 2：基于现有 SQLite 结构的 Drizzle Schema 定义
// 对应 server/db.js 中对 `projects` 与 `characters` 的建表语句。

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(), // TEXT PRIMARY KEY
  name: text('name').notNull(), // NOT NULL
  tags: text('tags').notNull().default('[]'), // JSON 字符串
  totalPanels: integer('total_panels').notNull().default(0),
  generatedPanels: integer('generated_panels').notNull().default(0),
  data: text('data'), // 完整项目对象快照(JSON)
  // SQLite 中 DATETIME 默认 CURRENT_TIMESTAMP，使用 TEXT 存储 ISO 字符串
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  tags: text('tags').notNull().default('[]'),
  basePrompt: text('base_prompt'),
  imageUrl: text('image_url'),
  imageIsUrl: integer('image_is_url').notNull().default(0),
  data: text('data'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// Job Queue 表：用于持久化 AI 图像生成任务
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(), // UUID
  type: text('type').notNull().default('image_generation'), // 任务类型
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] })
    .notNull()
    .default('pending'),
  priority: integer('priority').notNull().default(0), // 优先级，数字越大优先级越高
  payload: text('payload').notNull(), // JSON 字符串，存储任务参数
  result: text('result'), // JSON 字符串，存储任务结果
  error: text('error'), // 错误信息
  retryCount: integer('retry_count').notNull().default(0), // 重试次数
  maxRetries: integer('max_retries').notNull().default(3), // 最大重试次数
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  startedAt: text('started_at'), // 开始处理时间
  completedAt: text('completed_at') // 完成时间
});

// 推导出 SELECT 类型，供后续仓储层和服务层复用
export type ProjectRow = typeof projects.$inferSelect;
export type CharacterRow = typeof characters.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;

