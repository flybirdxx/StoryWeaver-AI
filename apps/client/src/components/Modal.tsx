import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md'
}) => {
  if (!isOpen) return null;

  const maxWidthClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-stone-900 rounded-xl p-6 w-full mx-4 border border-stone-200 dark:border-stone-700 ${maxWidthClasses[maxWidth]}`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {title && (
          <h3 className="text-xl font-bold mb-4 text-stone-800 dark:text-stone-100">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
};

