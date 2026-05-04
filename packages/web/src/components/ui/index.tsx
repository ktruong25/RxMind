'use client';

import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

// ── StatCard ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  variant?: 'default' | 'danger' | 'warn' | 'success';
}

export function StatCard({ label, value, sub, icon, variant = 'default' }: StatCardProps) {
  const variantClass = {
    default: 'border-border',
    danger:  'border-danger/40 bg-danger/5',
    warn:    'border-warn/40 bg-warn/5',
    success: 'border-success/40 bg-success/5',
  }[variant];

  return (
    <div className={cn('rounded-xl border bg-surface p-5 flex gap-4 items-start', variantClass)}>
      {icon && <div className="mt-0.5 text-muted">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-text">{value}</p>
        {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  action?: ReactNode;
}

export function Panel({ title, action, children, className, ...props }: PanelProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface', className)} {...props}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          {title && <h3 className="text-sm font-semibold text-text">{title}</h3>}
          {action && <div className="text-sm">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary', size = 'md', loading, children, className, disabled, ...props
}: ButtonProps) {
  const variantClass = {
    primary:   'bg-accent text-white hover:bg-accent/90',
    secondary: 'bg-surface border border-border text-text hover:bg-border/40',
    ghost:     'text-muted hover:text-text hover:bg-border/30',
    danger:    'bg-danger text-white hover:bg-danger/90',
    success:   'bg-success text-white hover:bg-success/90',
  }[variant];

  const sizeClass = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }[size];

  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variantClass, sizeClass, className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

// ── Tag ───────────────────────────────────────────────────────────────────────

interface TagProps {
  children: ReactNode;
  variant?: 'default' | 'danger' | 'warn' | 'success' | 'info';
}

export function Tag({ children, variant = 'default' }: TagProps) {
  const cls = {
    default: 'bg-border/60 text-muted',
    danger:  'bg-danger/15 text-danger',
    warn:    'bg-warn/15 text-warn',
    success: 'bg-success/15 text-success',
    info:    'bg-accent/15 text-accent',
  }[variant];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', cls)}>
      {children}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin text-muted', className)} />;
}

// ── Empty ─────────────────────────────────────────────────────────────────────

export function Empty({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-muted text-sm">{message}</div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs text-muted font-medium">{label}</label>}
      <input
        className={cn(
          'rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted',
          'focus:outline-none focus:ring-2 focus:ring-accent/50',
          className
        )}
        {...props}
      />
    </div>
  );
}
