'use client';

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Employee } from '@/types';

const formatValue = (value: number) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value}`;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card rounded-xl border border-border p-3 shadow-xl">
        <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-bold text-primary">
          ₹{(payload[0].value / 100000).toFixed(2)}L
        </p>
      </div>
    );
  }
  return null;
}

interface SalaryLineChartProps {
  employees?: Employee[];
}

export function SalaryLineChart({ employees = [] }: SalaryLineChartProps) {
  // Generate last 12 months chronological order
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Dynamic calculation based on employees and their joiningDate
  const currentYear = new Date().getFullYear();
  
  const chartData = months.map((monthName, index) => {
    // Determine the month's date range
    const monthIndex = index; // 0-indexed
    const dateLimit = new Date(currentYear, monthIndex + 1, 0); // Last day of that month
    
    // Sum salary of all employees who joined on or before this month's end date
    const monthlyExpenditure = employees
      .filter((emp) => {
        const joinDate = new Date(emp.joiningDate);
        return joinDate <= dateLimit && emp.status !== 'Inactive';
      })
      .reduce((sum, emp) => sum + (Number(emp.salary) || 0), 0);

    return {
      month: monthName,
      expenditure: monthlyExpenditure,
    };
  });

  const totalPayroll = employees.reduce((sum, emp) => sum + (Number(emp.salary) || 0), 0);
  const hasData = employees.length > 0 && totalPayroll > 0;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Monthly Salary Expenditure</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Total payroll over 12 months</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
          {currentYear}
        </div>
      </div>
      
      {!hasData ? (
        <div className="h-[220px] flex flex-col items-center justify-center border border-dashed border-border rounded-xl">
          <p className="text-xs font-medium text-muted-foreground">No payroll data yet</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Add employees with active salary to populate chart</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="expenditure"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#salaryGradient)"
              dot={{ fill: '#6366f1', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#6366f1', fill: 'hsl(var(--background))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
