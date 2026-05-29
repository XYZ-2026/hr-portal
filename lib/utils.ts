import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function calculateTenure(joiningDate: string, relievingDate?: string): string {
  const start = new Date(joiningDate);
  const end = relievingDate ? new Date(relievingDate) : new Date();
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) return `${remainingMonths} months`;
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11).toUpperCase();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Active':
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'Inactive':
      return 'text-red-400 bg-red-400/10 border-red-400/20';
    case 'On Leave':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'Generated':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'Sent':
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'Pending':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'Draft':
      return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    default:
      return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  }
}

export function getDepartmentColor(department: string): string {
  const colors: Record<string, string> = {
    Engineering: '#6366f1',
    Design: '#ec4899',
    Marketing: '#f59e0b',
    Sales: '#10b981',
    HR: '#8b5cf6',
    Finance: '#3b82f6',
    Operations: '#f97316',
    Product: '#14b8a6',
  };
  return colors[department] || '#6366f1';
}
