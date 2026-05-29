'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getDepartmentColor, formatCurrency } from '@/lib/utils';
import { Employee } from '@/types';

const RADIAN = Math.PI / 180;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCustomizedLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (percent < 0.06) return null;
  const radius = (innerRadius ?? 0) + ((outerRadius ?? 0) - (innerRadius ?? 0)) * 0.5;
  const x = (cx ?? 0) + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
  const y = (cy ?? 0) + radius * Math.sin(-(midAngle ?? 0) * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { headcount: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="glass-card rounded-xl border border-border p-3 shadow-xl">
        <p className="text-xs font-semibold text-foreground mb-1">{data.name}</p>
        <p className="text-sm font-bold text-primary">{formatCurrency(data.value)}</p>
        <p className="text-xs text-muted-foreground">{data.payload.headcount} employees</p>
      </div>
    );
  }
  return null;
}

interface DeptPieChartProps {
  employees?: Employee[];
}

export function DeptPieChart({ employees = [] }: DeptPieChartProps) {
  // Group employees dynamically by department
  const deptMap: Record<string, { totalSalary: number; headcount: number }> = {};
  employees.forEach((emp) => {
    const dept = emp.department || 'Other';
    if (!deptMap[dept]) {
      deptMap[dept] = { totalSalary: 0, headcount: 0 };
    }
    deptMap[dept].totalSalary += Number(emp.salary) || 0;
    deptMap[dept].headcount += 1;
  });

  const pieData = Object.entries(deptMap).map(([dept, data]) => ({
    name: dept,
    value: data.totalSalary,
    headcount: data.headcount,
    color: getDepartmentColor(dept),
  }));

  const hasData = pieData.length > 0;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Department Distribution</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Salary split by department</p>
      </div>
      
      {!hasData ? (
        <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-border rounded-xl mt-2">
          <p className="text-xs font-medium text-muted-foreground">No employees found</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Add employees to see distribution</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={85}
                innerRadius={50}
                dataKey="value"
                labelLine={false}
                label={renderCustomizedLabel}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 w-full">
            {pieData.slice(0, 6).map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
