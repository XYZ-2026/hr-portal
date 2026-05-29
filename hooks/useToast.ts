'use client';

import { useState, useCallback } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title: string, message?: string) => addToast({ title, message, variant: 'success' }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) => addToast({ title, message, variant: 'error' }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => addToast({ title, message, variant: 'warning' }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => addToast({ title, message, variant: 'info' }),
    [addToast]
  );

  return { toasts, addToast, removeToast, success, error, warning, info };
}
