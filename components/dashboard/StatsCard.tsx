'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  iconBg?: string;
  gradient?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBg = 'bg-primary/10 border-primary/20 text-primary',
  gradient,
  className,
}: StatsCardProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div
      className={cn(
        'stat-card glass-card rounded-2xl p-6 relative overflow-hidden group cursor-default',
        className
      )}
    >
      {/* Background gradient */}
      {gradient && (
        <div
          className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
            gradient
          )}
        />
      )}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center', iconBg)}>
            {icon}
          </div>
        </div>

        <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>

        <div className="flex items-center gap-1.5 mt-2">
          {isNeutral ? (
            <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          ) : isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          )}
          <span
            className={cn(
              'text-xs font-semibold',
              isNeutral
                ? 'text-muted-foreground'
                : isPositive
                  ? 'text-emerald-400'
                  : 'text-red-400'
            )}
          >
            {isPositive ? '+' : ''}
            {change}%
          </span>
          <span className="text-xs text-muted-foreground">{changeLabel}</span>
        </div>
      </div>
    </div>
  );
}
