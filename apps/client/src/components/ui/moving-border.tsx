import React from 'react';
import { cn } from '../../lib/utils';

interface MovingBorderProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

export const MovingBorder: React.FC<MovingBorderProps> = ({ 
  children, 
  className,
  duration = 2000 
}) => {
  return (
    <div
      className={cn(
        "relative inline-block rounded-lg bg-stone-50 dark:bg-stone-900 p-[2px] overflow-hidden",
        className
      )}
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-orange-500 via-purple-500 to-orange-500 animate-[shimmer_2s_linear_infinite]"
        style={{
          backgroundSize: '200% 100%',
          animation: `shimmer ${duration}ms linear infinite`,
        }}
      />
      <div className="relative bg-white dark:bg-stone-900 rounded-lg">
        {children}
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

