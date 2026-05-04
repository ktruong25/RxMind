import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isAfter, addDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function expiryWindow(expiry: string): 'expired' | '30' | '60' | '90' | 'ok' {
  const d = new Date(expiry);
  const now = new Date();
  if (!isAfter(d, now)) return 'expired';
  if (!isAfter(d, addDays(now, 30))) return '30';
  if (!isAfter(d, addDays(now, 60))) return '60';
  if (!isAfter(d, addDays(now, 90))) return '90';
  return 'ok';
}

export function expiryColor(window: ReturnType<typeof expiryWindow>) {
  return {
    expired: 'text-danger',
    '30':    'text-danger',
    '60':    'text-warn',
    '90':    'text-yellow-400',
    ok:      'text-success',
  }[window];
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export const REJECT_CODE_MAP: Record<string, string> = {
  '70': 'Product/Service Not Covered',
  '75': 'Prior Authorization Required',
  '76': 'Plan Limitations Exceeded',
  '79': 'Refill Too Soon',
  '88': 'DUR Reject',
  MR:   'Missing/Invalid Prescriber ID',
  NF:   'Formulary Exclusion',
};
