import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md'
}) => {
  const paddingClasses: Record<string, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div
      className={`bg-white dark:bg-stone-900 rounded-xl shadow-sm dark:shadow-black/30 border border-stone-200 dark:border-stone-800 transition-colors ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
};

