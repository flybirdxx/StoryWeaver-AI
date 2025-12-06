import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { App } from './App';
import './index.css';
import { logDiagnostics } from './lib/api-diagnostic';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// 开发环境：启动时诊断 API 连接
if (import.meta.env.DEV) {
  // 延迟 2 秒后运行诊断，给后端服务器启动时间
  setTimeout(() => {
    logDiagnostics().catch(console.error);
  }, 2000);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          toastOptions={{
            classNames: {
              toast: 'dark:bg-stone-800 dark:text-stone-100',
              title: 'dark:text-stone-100',
              description: 'dark:text-stone-400',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);



