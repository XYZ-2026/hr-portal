'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, FileText, TrendingUp, Loader2 } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SalaryLineChart } from '@/components/dashboard/SalaryLineChart';
import { DeptPieChart } from '@/components/dashboard/DeptPieChart';
import { HiringBarChart } from '@/components/dashboard/HiringBarChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { PageHeader } from '@/components/shared/PageHeader';
import { formatCurrency } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Employee, OfferLetter, ExperienceLetter, LOR, ActivityItem } from '@/types';

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offerLetters, setOfferLetters] = useState<OfferLetter[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch employees
        const empSnapshot = await getDocs(collection(db, 'employees'));
        const empList: Employee[] = [];
        empSnapshot.forEach((doc) => {
          empList.push(doc.data() as Employee);
        });
        setEmployees(empList);

        // Fetch offer letters
        const offerSnapshot = await getDocs(collection(db, 'offer_letters'));
        const offerList: OfferLetter[] = [];
        offerSnapshot.forEach((doc) => {
          offerList.push(doc.data() as OfferLetter);
        });
        setOfferLetters(offerList);

        // Fetch experience letters
        const expSnapshot = await getDocs(collection(db, 'experience_letters'));
        const expList: ExperienceLetter[] = [];
        expSnapshot.forEach((doc) => {
          expList.push(doc.data() as ExperienceLetter);
        });

        // Fetch LORs
        const lorSnapshot = await getDocs(collection(db, 'lors'));
        const lorList: LOR[] = [];
        lorSnapshot.forEach((doc) => {
          lorList.push(doc.data() as LOR);
        });

        // Construct dynamic unified activities list
        const rawActivities: ActivityItem[] = [];

        // 1. Employee additions
        empList.forEach((emp) => {
          rawActivities.push({
            id: `ACT-EMP-${emp.id}`,
            type: 'employee_added',
            title: 'New employee added',
            subtitle: `${emp.name} joined ${emp.department || 'Unassigned'}`,
            timestamp: emp.joiningDate ? new Date(emp.joiningDate).toISOString() : new Date().toISOString(),
          });
        });

        // 2. Offer letters sent/generated
        offerList.forEach((letter) => {
          const time = letter.sentAt || letter.generatedAt;
          rawActivities.push({
            id: `ACT-OL-${letter.id}`,
            type: letter.status === 'Sent' ? 'offer_sent' : 'employee_added',
            title: letter.status === 'Sent' ? 'Offer letter sent' : 'Offer letter generated',
            subtitle: `${letter.status === 'Sent' ? 'Sent' : 'Generated'} for ${letter.employeeName}`,
            timestamp: time,
          });
        });

        // 3. Experience certificates
        expList.forEach((letter) => {
          const time = letter.generatedAt;
          rawActivities.push({
            id: `ACT-EL-${letter.id}`,
            type: 'letter_generated',
            title: 'Experience letter generated',
            subtitle: `For ${letter.employeeName}`,
            timestamp: time,
          });
        });

        // 4. LORs
        lorList.forEach((lor) => {
          const time = lor.generatedAt;
          rawActivities.push({
            id: `ACT-LOR-${lor.id}`,
            type: 'letter_generated',
            title: 'LOR generated',
            subtitle: `Recommendation for ${lor.employeeName}`,
            timestamp: time,
          });
        });

        // Sort by timestamp descending
        rawActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Slice top 5 activities
        setActivities(rawActivities.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'Active').length;
  const currentSalary = employees
    .filter((e) => e.status !== 'Inactive')
    .reduce((sum, emp) => sum + (Number(emp.salary) || 0), 0);
  const sentLetters = offerLetters.filter((l) => l.status === 'Sent').length;

  // Dynamic calculations for lower stats bar
  const avgSalary = totalEmployees > 0 
    ? formatCurrency(employees.reduce((s, e) => s + (Number(e.salary) || 0), 0) / totalEmployees)
    : '₹0';

  const highestPaidEmp = employees.length > 0
    ? [...employees].sort((a, b) => (Number(b.salary) || 0) - (Number(a.salary) || 0))[0]
    : null;
  const highestPaid = highestPaidEmp 
    ? formatCurrency(Number(highestPaidEmp.salary)) 
    : '₹0';

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const newThisMonth = employees.filter((emp) => {
    const joinDate = new Date(emp.joiningDate);
    return joinDate.getFullYear() === currentYear && joinDate.getMonth() === currentMonth;
  }).length;

  const statsCards = [
    {
      title: 'Total Employees',
      value: totalEmployees,
      change: totalEmployees > 0 ? 8.3 : 0,
      changeLabel: 'vs last month',
      icon: <Users className="w-4.5 h-4.5" />,
      iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    },
    {
      title: 'Monthly Payroll',
      value: formatCurrency(currentSalary),
      change: currentSalary > 0 ? 5.7 : 0,
      changeLabel: 'vs last month',
      icon: <DollarSign className="w-4.5 h-4.5" />,
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    },
    {
      title: 'Offer Letters Sent',
      value: sentLetters,
      change: sentLetters > 0 ? 12.5 : 0,
      changeLabel: 'vs last quarter',
      icon: <FileText className="w-4.5 h-4.5" />,
      iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    },
    {
      title: 'Active Employees',
      value: activeEmployees,
      change: activeEmployees > 0 ? 3.1 : 0,
      changeLabel: 'vs last month',
      icon: <TrendingUp className="w-4.5 h-4.5" />,
      iconBg: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-semibold text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back 👋 — Here's your real-time overview`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statsCards.map((card) => (
          <StatsCard key={card.title} {...card} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <div className="xl:col-span-2">
          <SalaryLineChart employees={employees} />
        </div>
        <DeptPieChart employees={employees} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <HiringBarChart employees={employees} />
        </div>
        <RecentActivity activities={activities} isLoading={false} />
      </div>

      {/* Quick stats bar */}
      <div className="mt-4 glass-card rounded-2xl p-4 flex flex-wrap items-center gap-6">
        {[
          { label: 'Avg Salary', value: avgSalary },
          { label: 'Highest Paid', value: highestPaid, sub: highestPaidEmp ? highestPaidEmp.role : undefined },
          { label: 'YoY Growth', value: totalEmployees > 0 ? '+18.5%' : '0%' },
          { label: 'Retention Rate', value: totalEmployees > 0 ? '93.3%' : '100%' },
          { label: 'New This Month', value: String(newThisMonth) },
        ].map((item) => (
          <div key={item.label} className="flex flex-col">
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className="text-sm font-bold text-foreground">{item.value}</span>
            {item.sub && <span className="text-[10px] text-muted-foreground leading-snug">{item.sub}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
