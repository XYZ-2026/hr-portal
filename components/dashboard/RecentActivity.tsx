'use client';

import { formatRelativeTime } from '@/lib/utils';
import { UserPlus, Mail, FileText, Award, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityItem } from '@/types';

const activityConfig: Record<
  ActivityItem['type'],
  { icon: React.ReactNode; color: string; bg: string }
> = {
  employee_added: {
    icon: <UserPlus className="w-3.5 h-3.5" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
  },
  offer_sent: {
    icon: <FileText className="w-3.5 h-3.5" />,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
  },
  email_sent: {
    icon: <Mail className="w-3.5 h-3.5" />,
    color: 'text-violet-400',
    bg: 'bg-violet-400/10 border-violet-400/20',
  },
  letter_generated: {
    icon: <Award className="w-3.5 h-3.5" />,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/20',
  },
};

interface RecentActivityProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
}

export function RecentActivity({ activities = [], isLoading = false }: RecentActivityProps) {
  return (
    <div className="glass-card rounded-2xl p-6 h-full flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Latest HR actions</p>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin mb-1.5" />
            <p className="text-xs text-muted-foreground">Loading activity...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border rounded-xl">
            <p className="text-xs font-medium text-muted-foreground">No recent actions</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">System changes will appear here</p>
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px] pr-1">
            {activities.map((item) => {
              const config = activityConfig[item.type] || activityConfig['employee_added'];
              return (
                <div key={item.id} className="flex items-start gap-3 group">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5',
                      config.bg,
                      config.color
                    )}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-snug">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
