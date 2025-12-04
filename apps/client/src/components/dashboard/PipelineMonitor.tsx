import React from 'react';
import type { Project } from '@storyweaver/shared';

interface PipelineMonitorProps {
  project: Project | null;
}

interface PipelineStage {
  id: string;
  label: string;
  description: string;
  color: string;
  isActive: boolean;
}

export const PipelineMonitor: React.FC<PipelineMonitorProps> = ({ project }) => {
  // 根据项目数据判断各阶段状态
  const hasScript = Boolean(project?.script && project.script.trim().length > 0);
  const hasAnalysis = Boolean(
    project?.analysis && 
    project.analysis.panels && 
    Array.isArray(project.analysis.panels) && 
    project.analysis.panels.length > 0
  );
  const hasGeneratedPanels = Boolean(
    project?.generatedPanels && 
    project.generatedPanels > 0
  );

  const stages: PipelineStage[] = [
    {
      id: 'input-analysis',
      label: 'Stage 1: Input Analysis',
      description: '分析主题、角色、情绪',
      color: 'blue',
      isActive: hasScript
    },
    {
      id: 'director-agent',
      label: 'Stage 2: Director Agent',
      description: '故事拆解、镜头布局',
      color: 'purple',
      isActive: hasAnalysis
    },
    {
      id: 'visual-prompter',
      label: 'Stage 3: Visual Prompter',
      description: '生成最终 Prompt & 安全清洗',
      color: 'orange',
      isActive: hasGeneratedPanels
    }
  ];

  const getStageStyles = (stage: PipelineStage) => {
    const baseStyles = 'p-4 rounded-lg border relative group transition-all duration-300';
    
    if (stage.isActive) {
      const colorMap = {
        blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 hover:border-blue-500 shadow-sm',
        purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-400 dark:border-purple-700 hover:border-purple-500 shadow-sm',
        orange: 'bg-orange-50 dark:bg-orange-950/30 border-orange-400 dark:border-orange-700 hover:border-orange-500 shadow-sm'
      };
      return `${baseStyles} ${colorMap[stage.color as keyof typeof colorMap]}`;
    } else {
      const colorMap = {
        blue: 'bg-blue-50/30 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900',
        purple: 'bg-purple-50/30 dark:bg-purple-950/10 border-purple-200 dark:border-purple-900',
        orange: 'bg-orange-50/30 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900'
      };
      return `${baseStyles} ${colorMap[stage.color as keyof typeof colorMap]} opacity-60`;
    }
  };

  const getTextStyles = (stage: PipelineStage) => {
    if (stage.isActive) {
      const colorMap = {
        blue: 'text-blue-900 dark:text-blue-200',
        purple: 'text-purple-900 dark:text-purple-200',
        orange: 'text-orange-900 dark:text-orange-200'
      };
      return {
        title: `font-bold ${colorMap[stage.color as keyof typeof colorMap]}`,
        desc: `text-xs mt-2 ${colorMap[stage.color as keyof typeof colorMap].replace('900', '700').replace('200', '300')}`
      };
    } else {
      return {
        title: 'font-bold text-stone-400 dark:text-stone-500',
        desc: 'text-xs mt-2 text-stone-300 dark:text-stone-600'
      };
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-100 dark:border-stone-800 transition-colors">
      <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">
        提示词工程架构 (Live Monitor)
      </h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
        基于系统提示词的实时处理流。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        {stages.map((stage, index) => {
          const styles = getStageStyles(stage);
          const textStyles = getTextStyles(stage);
          
          return (
            <div key={stage.id} className={styles}>
              <div className={textStyles.title}>{stage.label}</div>
              <div className={textStyles.desc}>{stage.description}</div>
              {stage.isActive && (
                <div className="absolute top-2 right-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>
              )}
              {index < stages.length - 1 && (
                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 hidden md:block">
                  <span className={stage.isActive && stages[index + 1]?.isActive ? 'text-green-500' : 'text-stone-300 dark:text-stone-600'}>
                    →
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!project && (
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-4 text-center">
          选择项目后，Pipeline 将根据项目进度自动点亮
        </p>
      )}
    </div>
  );
};

