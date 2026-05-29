import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  Active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Inactive: 'text-red-400 bg-red-400/10 border-red-400/20',
  'On Leave': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Generated: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Sent: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Draft: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

const statusDots: Record<string, string> = {
  Active: 'bg-emerald-400',
  Inactive: 'bg-red-400',
  'On Leave': 'bg-amber-400',
  Generated: 'bg-blue-400',
  Sent: 'bg-emerald-400',
  Pending: 'bg-amber-400',
  Draft: 'bg-slate-400',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] || 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  const dot = statusDots[status] || 'bg-slate-400';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        style,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {status}
    </span>
  );
}
