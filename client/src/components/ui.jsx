import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export const Spinner = ({ size = 20, className = '' }) => (
  <svg
    className={`animate-spin ${className}`}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z" />
  </svg>
);

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  ...rest
}) => {
  const base = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger'
  }[variant] || 'btn-primary';
  const sizing = size === 'sm' ? 'btn-sm' : '';
  return (
    <button className={`${base} ${sizing} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Spinner size={16} /> : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
};

export const Input = ({ label, error, hint, className = '', ...rest }) => (
  <div className={className}>
    {label ? <label className="label">{label}</label> : null}
    <input className="input" aria-invalid={!!error} {...rest} />
    {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    {!error && hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
  </div>
);

export const Select = ({ label, error, hint, options = [], className = '', placeholder, ...rest }) => (
  <div className={className}>
    {label ? <label className="label">{label}</label> : null}
    <select className="input" aria-invalid={!!error} {...rest}>
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    {!error && hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
  </div>
);

export const Textarea = ({ label, error, className = '', ...rest }) => (
  <div className={className}>
    {label ? <label className="label">{label}</label> : null}
    <textarea className="input min-h-[80px]" aria-invalid={!!error} {...rest} />
    {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
  </div>
);

export const Card = ({ children, className = '', ...rest }) => (
  <div className={`card ${className}`} {...rest}>
    {children}
  </div>
);

export const Badge = ({ children, tone = 'slate', className = '' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    red: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone] || tones.slate} ${className}`}
    >
      {children}
    </span>
  );
};

export const Modal = ({ open, onClose, title, children, width = 'max-w-lg', footer }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${width} animate-fade-in rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const PageHeader = ({ title, subtitle, actions, icon: Icon }) => (
  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div className="flex items-center gap-3">
      {Icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          <Icon size={20} />
        </div>
      ) : null}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

export const EmptyState = ({ icon: Icon, title, subtitle, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
    {Icon ? (
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon size={26} />
      </div>
    ) : null}
    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
    {subtitle ? <p className="mt-1 max-w-sm text-xs text-slate-400">{subtitle}</p> : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`} />
);

export const LoadingPage = () => (
  <div className="flex h-64 items-center justify-center text-brand-600">
    <Spinner size={28} />
  </div>
);

export const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);
  const styles = {
    success: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    error: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
    info: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
  };
  return (
    <div className="fixed bottom-4 right-4 z-[60] animate-fade-in">
      <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-lg ${styles[type]}`}>
        {message}
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, loading, tone = 'danger' }) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    width="max-w-md"
    footer={
      <>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={tone} loading={loading} onClick={onConfirm}>
          Confirm
        </Button>
      </>
    }
  >
    <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
  </Modal>
);

export const Pagination = ({ page, limit, total, onPage, onLimit }) => {
  const pages = Math.max(1, Math.ceil(total / (limit || 20)));
  if (pages <= 1 && !onLimit) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="text-xs text-slate-500">
        Page {page} of {pages} · {total} record{total === 1 ? '' : 's'}
      </div>
      <div className="flex items-center gap-2">
        {onLimit ? (
          <select
            className="input w-20 py-1.5 text-xs"
            value={limit}
            onChange={(e) => onLimit(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        ) : null}
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  Badge,
  Modal,
  PageHeader,
  EmptyState,
  Spinner,
  Skeleton,
  Toast,
  ConfirmDialog,
  Pagination,
  LoadingPage
};