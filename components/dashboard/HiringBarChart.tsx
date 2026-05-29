'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Employee } from '@/types';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card rounded-xl border border-border p-3 shadow-xl">
        <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground capitalize">{entry.name}:</span>
            <span className="font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

interface HiringBarChartProps {
  employees?: Employee[];
}

export function HiringBarChart({ employees = [] }: HiringBarChartProps) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();

  // Calculate monthly hires and leaves dynamically
  const chartData = months.map((monthName, index) => {
    const monthIndex = index; // 0-indexed

    // Count hires in this month of current year
    const hiresCount = employees.filter((emp) => {
      const joinDate = new Date(emp.joiningDate);
      return joinDate.getFullYear() === currentYear && joinDate.getMonth() === monthIndex;
    }).length;

    // Count departures (Inactive status) in this month of current year (approximate based on joining or custom date if inactive)
    const leavesCount = employees.filter((emp) => {
      if (emp.status !== 'Inactive') return false;
      // If we don't store relievingDate on Employee, we fallback to inactive employees who joined this month
      const joinDate = new Date(emp.joiningDate);
      return joinDate.getFullYear() === currentYear && joinDate.getMonth() === monthIndex;
    }).length;

    return {
      month: monthName,
      hired: hiresCount,
      left: leavesCount,
    };
  });

  const hasData = employees.length > 0;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Hiring Trends</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Hires vs departures monthly</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
            Hired
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />
            Left
          </div>
        </div>
      </div>
      
      {!hasData ? (
        <div className="h-[220px] flex flex-col items-center justify-center border border-dashed border-border rounded-xl">
          <p className="text-xs font-medium text-muted-foreground">No hiring data yet</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Add employees to see monthly trends</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            barGap={4}
            barSize={12}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
            <Bar dataKey="hired" fill="#6366f1" radius={[4, 4, 0, 0]} name="hired" />
            <Bar dataKey="left" fill="#f87171" radius={[4, 4, 0, 0]} name="left" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
