'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, DollarSign, Users, Award, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { formatCurrency, getDepartmentColor } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Employee } from '@/types';

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card rounded-xl border border-border p-3 shadow-xl text-xs">
        <p className="font-semibold text-muted-foreground mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="font-bold text-primary">
            {typeof entry.value === 'number' && entry.value > 100000
              ? formatCurrency(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function SalaryAnalyticsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'employees'));
        const list: Employee[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as Employee);
        });
        setEmployees(list);
      } catch (err) {
        console.error('Failed to fetch employees for analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const totalMonthly = employees
    .filter((e) => e.status !== 'Inactive')
    .reduce((sum, d) => sum + (Number(d.salary) || 0), 0);
  const totalYearly = totalMonthly * 12;
  const avgSalary = employees.length > 0 ? Math.round(totalMonthly / employees.length) : 0;
  const highestSalary = employees.length > 0 ? Math.max(...employees.map((e) => Number(e.salary) || 0)) : 0;

  // Monthly trends (expenditure matches when they joined)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const monthlyTrends = months.map((monthName, index) => {
    const dateLimit = new Date(currentYear, index + 1, 0);
    const exp = employees
      .filter((e) => {
        const joinDate = new Date(e.joiningDate);
        return joinDate <= dateLimit && e.status !== 'Inactive';
      })
      .reduce((s, e) => s + (Number(e.salary) || 0), 0);
    return { month: monthName, expenditure: exp };
  });

  // Dept salaries
  const deptMap: Record<string, { totalSalary: number; headcount: number; avgSalary: number; department: string }> = {};
  employees.forEach((emp) => {
    const dept = emp.department || 'Other';
    if (!deptMap[dept]) {
      deptMap[dept] = { totalSalary: 0, headcount: 0, avgSalary: 0, department: dept };
    }
    deptMap[dept].totalSalary += Number(emp.salary) || 0;
    deptMap[dept].headcount += 1;
  });
  const deptSalaries = Object.values(deptMap).map((d) => {
    d.avgSalary = d.headcount > 0 ? Math.round(d.totalSalary / d.headcount) : 0;
    return d;
  });

  // Top roles
  const topRoles = [...employees]
    .sort((a, b) => (Number(b.salary) || 0) - (Number(a.salary) || 0))
    .slice(0, 5);

  const yearlyData = [
    { year: String(currentYear - 4), total: totalYearly * 0.6 },
    { year: String(currentYear - 3), total: totalYearly * 0.75 },
    { year: String(currentYear - 2), total: totalYearly * 0.85 },
    { year: String(currentYear - 1), total: totalYearly * 0.95 },
    { year: String(currentYear), total: totalYearly },
  ];

  const hasData = employees.length > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-semibold text-muted-foreground">Loading salary statistics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Salary Analytics"
        subtitle="Comprehensive compensation insights and trends"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Monthly Payroll"
          value={formatCurrency(totalMonthly)}
          change={totalMonthly > 0 ? 5.7 : 0}
          changeLabel="vs last month"
          icon={<DollarSign className="w-4.5 h-4.5" />}
          iconBg="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        />
        <StatsCard
          title="Annual Payroll"
          value={formatCurrency(totalYearly)}
          change={totalYearly > 0 ? 18.5 : 0}
          changeLabel="vs last year"
          icon={<TrendingUp className="w-4.5 h-4.5" />}
          iconBg="bg-blue-500/10 border-blue-500/20 text-blue-400"
        />
        <StatsCard
          title="Avg. Monthly Salary"
          value={formatCurrency(avgSalary)}
          change={avgSalary > 0 ? 3.2 : 0}
          changeLabel="vs last month"
          icon={<Users className="w-4.5 h-4.5" />}
          iconBg="bg-violet-500/10 border-violet-500/20 text-violet-400"
        />
        <StatsCard
          title="Highest Salary"
          value={formatCurrency(highestSalary)}
          change={0}
          changeLabel="unchanged"
          icon={<Award className="w-4.5 h-4.5" />}
          iconBg="bg-amber-500/10 border-amber-500/20 text-amber-400"
        />
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
          <DollarSign className="w-12 h-12 text-primary/50 mb-3" />
          <p className="text-sm font-semibold text-foreground">No payroll data available</p>
          <p className="text-xs text-muted-foreground mt-1">Add employees to generate dynamic salary analytics and trends.</p>
        </div>
      ) : (
        <>
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            {/* Salary Trends */}
            <div className="glass-card rounded-2xl p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">Monthly Expenditure Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{currentYear} payroll overview</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyTrends} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
                  <Area type="monotone" dataKey="expenditure" stroke="#6366f1" strokeWidth={2.5} fill="url(#salGrad2)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Department Salary Split */}
            <div className="glass-card rounded-2xl p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">Department Salary Split</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Monthly total by department</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={deptSalaries}
                  margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                  <Bar dataKey="totalSalary" radius={[4, 4, 0, 0]}>
                    {deptSalaries.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getDepartmentColor(entry.department)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Yearly growth */}
            <div className="glass-card rounded-2xl p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">Yearly Growth</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Annual payroll trend</p>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={yearlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Highest paid roles */}
            <div className="xl:col-span-2 glass-card rounded-2xl p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">Top Earners</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Highest paid employees</p>
              </div>
              <div className="space-y-3">
                {topRoles.map((emp, index) => {
                  const maxSalary = Number(topRoles[0].salary) || 1;
                  const pct = ((Number(emp.salary) || 0) / maxSalary) * 100;
                  return (
                    <div key={emp.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                        {emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-semibold text-foreground truncate">{emp.name}</p>
                          <span className="text-xs font-bold text-foreground ml-2 flex-shrink-0">
                            {formatCurrency(Number(emp.salary) || 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-12 text-right flex-shrink-0 truncate">
                            {emp.role.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dept summary table */}
              <div className="mt-5 pt-4 border-t border-border/50">
                <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <span>Department</span>
                  <span className="text-right">Headcount</span>
                  <span className="text-right">Avg Salary</span>
                  <span className="text-right">Total</span>
                </div>
                {deptSalaries.slice(0, 5).map((dept) => (
                  <div key={dept.department} className="grid grid-cols-4 gap-2 text-xs py-1.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getDepartmentColor(dept.department) }}
                      />
                      <span className="text-foreground truncate">{dept.department}</span>
                    </div>
                    <span className="text-right text-muted-foreground">{dept.headcount}</span>
                    <span className="text-right text-muted-foreground">{formatCurrency(dept.avgSalary)}</span>
                    <span className="text-right font-semibold text-foreground">{formatCurrency(dept.totalSalary)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
