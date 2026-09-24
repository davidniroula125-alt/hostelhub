import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { X } from 'lucide-react';

const ToastContext = createContext(null);

let idSeq = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (message, type = 'success') => {
      const id = ++idSeq;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
      dismiss
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-fade-in rounded-xl border px-4 py-2.5 shadow-lg backdrop-blur ${
              t.type === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-200'
                : t.type === 'error'
                ? 'border-rose-200 bg-rose-50/95 text-rose-800 dark:border-rose-800 dark:bg-rose-950/95 dark:text-rose-200'
                : 'border-blue-200 bg-blue-50/95 text-blue-800 dark:border-blue-800 dark:bg-blue-950/95 dark:text-blue-200'
            }`}
          >
            <div className="flex items-start gap-2 text-sm font-medium">
              {t.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : t.type === 'error' ? <XCircle size={16} className="mt-0.5 shrink-0" /> : <Info size={16} className="mt-0.5 shrink-0" />}
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export default ToastContext;