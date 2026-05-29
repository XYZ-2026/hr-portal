'use client';

import React, { createContext, useContext } from 'react';
import { useToast, Toast, ToastVariant } from '@/hooks/useToast';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastContextType {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider');
  return ctx;
}

const toastConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; className: string; iconClass: string }
> = {
  success: {
    icon: <CheckCircle className="w-4 h-4" />,
    className: 'border-emerald-500/30 bg-emerald-500/10',
    iconClass: 'text-emerald-400',
  },
  error: {
    icon: <XCircle className="w-4 h-4" />,
    className: 'border-red-500/30 bg-red-500/10',
    iconClass: 'text-red-400',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    className: 'border-amber-500/30 bg-amber-500/10',
    iconClass: 'text-amber-400',
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    className: 'border-blue-500/30 bg-blue-500/10',
    iconClass: 'text-blue-400',
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const config = toastConfig[toast.variant];
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm shadow-lg',
        'animate-in slide-in-from-right-4 fade-in duration-300',
        'glass-card',
        config.className
      )}
    >
      <span className={cn('mt-0.5 flex-shrink-0', config.iconClass)}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-muted-foreground mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast, success, error, warning, info } = useToast();

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 w-80 max-w-[calc(100vw-3rem)]">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
