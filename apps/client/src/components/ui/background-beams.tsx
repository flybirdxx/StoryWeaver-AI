import React from 'react';
import { cn } from '../../lib/utils';

export const BackgroundBeams: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-stone-50/50 to-transparent dark:via-stone-950/50" />
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-pulse delay-2000" />
    </div>
  );
};

