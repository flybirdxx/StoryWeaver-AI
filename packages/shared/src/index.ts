// 共享类型定义：后端 Drizzle Schema 与前端 Zustand Store 的「契约层」
// Phase 1：只给出最小可用版本，后续会根据实际表结构继续扩展。

// Panel 状态机：Draft -> Prompted -> Generating -> Done
// Draft: 只有文字描述，没有提示词
// Prompted: 已有提示词，但未开始生成
// Generating: 正在生成图像
// Done: 已完成，有图像
// Failed: 生成失败
export type PanelStatus = 'draft' | 'prompted' | 'generating' | 'completed' | 'failed';

// 向后兼容：保留旧的 pending 状态，映射到 draft
export type LegacyPanelStatus = 'pending' | 'generating' | 'completed' | 'failed';

// 基础 Panel 类型（用于数据库存储）
export interface Panel {
  id: string | number;
  projectId?: string;
  panelIndex?: number;
  type?: string; // 镜头类型：Close-up, Mid Shot, Wide Shot, Action
  prompt?: string;
  dialogue?: string;
  imageUrl?: string | null;
  imageIsUrl?: boolean;
  duration?: number;
  sfx?: string;
  status?: PanelStatus;
  updatedAt?: number;
}

// 扩展的 StoryboardPanel 类型（用于前端展示）
export interface StoryboardPanel extends Panel {
  // 前端特有的字段
  selected?: boolean;
}

export interface Project {
  id: string;
  title?: string;
  name?: string; // 兼容性：有些地方用 name
  logline?: string;
  theme?: string;
  tags?: string[];
  totalPanels?: number;
  generatedPanels?: number;
  availableFeatures?: string[];
  analysis?: any;
  script?: string;
  stats?: {
    scenes?: number;
    stage?: string;
  };
  createdAt?: number;
  updatedAt?: number;
}

export interface Character {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  basePrompt?: string;
  imageUrl?: string | null;
  imageIsUrl?: boolean;
  createdAt?: string;
  updatedAt?: string;
}


