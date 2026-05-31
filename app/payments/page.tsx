'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToastContext } from '@/components/providers/ToastProvider';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Calendar,
  X,
  Check,
  Search,
  ChevronDown,
  Loader2,
  Eye,
  ExternalLink,
  Edit2,
  Sparkles,
  ArrowLeft,
  CalendarDays,
  FileText,
  Info,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Employee, Attendance, PaymentRecord } from '@/types';

const getElapsedTime = (inStr?: string, outStr?: string) => {
  if (!inStr || !outStr) return '—';
  const diffMs = new Date(outStr).getTime() - new Date(inStr).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${mins}m`;
};

export default function PaymentsPage() {
  const toast = useToastContext();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'payroll' | 'sundays'>('payroll');

  // Month selector (defaults to current month)
  const now = new Date();
  const currentYearStr = String(now.getFullYear());
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const [selectedMonth, setSelectedMonth] = useState(`${currentYearStr}-${currentMonthStr}`);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activePayoutEmployee, setActivePayoutEmployee] = useState<any | null>(null);
  const [activeAuditEmployee, setActiveAuditEmployee] = useState<Employee | null>(null);
  const [customPayoutAmount, setCustomPayoutAmount] = useState<number>(0);

  // Sunday review states
  const [reviewShift, setReviewShift] = useState<Attendance | null>(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Editable UPI inputs
  const [editingUpiEmpId, setEditingUpiEmpId] = useState<string | null>(null);
  const [upiEditValue, setUpiEditValue] = useState('');

  // Setup dynamic real-time sync across collections
  useEffect(() => {
    setLoading(true);

    const unsubEmp = onSnapshot(collection(db, 'employees'), (snap) => {
      const list: Employee[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Employee));
      setEmployees(list);
    });

    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snap) => {
      const list: Attendance[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Attendance));
      setAttendance(list);
    });

    const unsubPay = onSnapshot(collection(db, 'payments'), (snap) => {
      const list: PaymentRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PaymentRecord));
      setPayments(list);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => {
      unsubEmp();
      unsubAtt();
      unsubPay();
    };
  }, []);

  // Compute month variables
  const [selYear, selMonth] = selectedMonth.split('-').map(Number);
  const totalDaysInMonth = new Date(selYear, selMonth, 0).getDate();
  const localTodayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  let sundaysCount = 0;
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateObj = new Date(selYear, selMonth - 1, d);
    if (dateObj.getDay() === 0) sundaysCount++;
  }
  const totalWorkingDays = totalDaysInMonth - sundaysCount;

  // Aggregate stats per employee for selected month
  const getEmployeeStats = (emp: Employee) => {
    let presentDays = 0;
    let absentDays = 0;
    let sundayWorkedCount = 0;
    let sundayPendingCount = 0;

    const empLogsMap: Record<string, Attendance> = {};
    attendance.forEach(log => {
      if (log.employeeId === emp.id || log.employeeId === emp.employeeId) {
        const dateParts = log.date.split('-');
        if (dateParts.length === 3) {
          const logYear = Number(dateParts[0]);
          const logMonth = Number(dateParts[1]);
          if (logYear === selYear && logMonth === selMonth) {
            empLogsMap[log.date] = log;
          }
        }
      }
    });

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(selYear, selMonth - 1, d);
      const isSunday = dateObj.getDay() === 0;

      const log = empLogsMap[dateStr];
      const isPast = dateStr < localTodayStr;

      if (isSunday) {
        if (log && log.checkInTime && log.checkOutTime) {
          const status = log.sundayReimbursementStatus?.toLowerCase();
          if (status === 'approved') {
            sundayWorkedCount++;
          } else if (status === 'pending') {
            sundayPendingCount++;
          }
        }
      } else {
        if (log && log.checkInTime) {
          if (log.checkOutTime || dateStr === localTodayStr) {
            presentDays++;
          }
        } else if (isPast || dateStr === localTodayStr) {
          absentDays++;
        }
      }
    }

    const totalPayableDays = Math.max(0, totalDaysInMonth - absentDays + sundayWorkedCount);
    
    // Find active payment configuration by checking both auto-generated doc ID and human-readable ID
    const paymentRecord = payments.find(p => 
      (p.employeeId === emp.id || p.employeeId === emp.employeeId || p.id === `${emp.id}_${selectedMonth}` || p.id === `${emp.employeeId}_${selectedMonth}`) && 
      p.month === selectedMonth
    ) || {
      paymentStatus: 'Pending',
      remarks: '',
      transactionRef: '',
    };

    const rawStatus = paymentRecord.paymentStatus || 'Pending';
    const normalizedPaymentStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

    // Replace dynamic salary calculation with static Base Salary per user instructions
    const baseSalary = Number(emp.salary) || 0;
    const calculatedPayout = baseSalary;

    return {
      presentDays,
      absentDays,
      sundayWorkedCount,
      sundayPendingCount,
      totalPayableDays,
      paymentStatus: normalizedPaymentStatus,
      remarks: paymentRecord.remarks,
      transactionRef: paymentRecord.transactionRef,
      calculatedPayout,
    };
  };

  // Filtered employees list for Tab 1
  const payrollItems = employees.map(emp => {
    const stats = getEmployeeStats(emp);
    return {
      employee: emp,
      ...stats
    };
  }).filter(item => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.employee.name.toLowerCase().includes(query) ||
        item.employee.employeeId.toLowerCase().includes(query) ||
        item.employee.role.toLowerCase().includes(query) ||
        item.employee.department.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Filtered pending Sunday shifts for Tab 2
  const sundayWorkRequests = attendance.filter(log => {
    if (!log.isSunday || log.sundayReimbursementStatus !== 'pending') return false;
    
    // Check selected month in a timezone-safe manner
    const dateParts = log.date.split('-');
    if (dateParts.length === 3) {
      const logYear = Number(dateParts[0]);
      const logMonth = Number(dateParts[1]);
      return logYear === selYear && logMonth === selMonth;
    }
    return false;
  }).map(log => {
    const employee = employees.find(e => e.id === log.employeeId || e.employeeId === log.employeeId);
    return {
      log,
      employee
    };
  }).filter(item => {
    if (searchQuery && item.employee) {
      const query = searchQuery.toLowerCase();
      return (
        item.employee.name.toLowerCase().includes(query) ||
        item.employee.employeeId.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Dynamic real-time Paid/Unpaid Status Toggler (Direct Firestore Write with NO popups)
  const handleTogglePaymentStatus = async (item: any, forcePaid: boolean, overrideAmount?: number) => {
    const payId = `${item.employee.id}_${selectedMonth}`;
    const payDocRef = doc(db, 'payments', payId);

    const finalAmount = overrideAmount !== undefined ? overrideAmount : item.calculatedPayout;

    const record: PaymentRecord = {
      id: payId,
      employeeId: item.employee.id,
      employeeName: item.employee.name,
      month: selectedMonth,
      salaryAmount: finalAmount,
      presentDays: item.presentDays,
      absentDays: item.absentDays,
      sundayWorkedCount: item.sundayWorkedCount,
      totalPayableDays: item.totalPayableDays,
      upiId: item.employee.upiId || '',
      paymentStatus: forcePaid ? 'Paid' : 'Pending',
      remarks: forcePaid 
        ? `Marked as Paid by Admin (${formatCurrency(finalAmount)})` 
        : 'Marked as Unpaid by Admin',
      transactionRef: '',
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(payDocRef, record);
      toast.success(
        forcePaid ? 'Salary Marked as Paid' : 'Salary Marked as Unpaid',
        `Instant transition completed for ${item.employee.name}.`
      );
    } catch (err) {
      console.error(err);
      toast.error('Sync Failed', 'Could not save payment coordinates.');
    }
  };

  // Sunday reimbursement approvals
  const handleReviewSundayShift = async (approved: boolean) => {
    if (!reviewShift) return;

    setReviewLoading(true);
    const logDocRef = doc(db, 'attendance', reviewShift.id);

    const updates = {
      sundayReimbursementStatus: approved ? 'approved' : 'rejected',
      sundayRemarks: adminRemarks.trim() || (approved ? 'Extra shift claim approved.' : 'Extra shift claim rejected.'),
    };

    try {
      await updateDoc(logDocRef, updates);
      setReviewShift(null);
      setAdminRemarks('');
      toast.success(
        approved ? 'Reimbursement Approved!' : 'Reimbursement Rejected',
        approved
          ? 'Sunday shift extra duty has been approved. Total payable attendance has been updated.'
          : 'Reimbursement claim has been rejected.'
      );
    } catch (err) {
      console.error(err);
      toast.error('Submission Failed', 'Could not complete Sunday shift audit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  // Admin edit UPI inline
  const handleSaveInlineUpi = async (empId: string) => {
    const formatted = upiEditValue.trim();
    if (!formatted || !formatted.includes('@')) {
      toast.error('Invalid VPA', 'Please enter a valid UPI address format (e.g. user@bank).');
      return;
    }

    try {
      await updateDoc(doc(db, 'employees', empId), {
        upiId: formatted
      });
      setEditingUpiEmpId(null);
      toast.success('UPI ID Secured', 'Employee coordinates have been successfully synced.');
    } catch (err) {
      toast.error('Sync Failed', 'Could not update UPI ID.');
    }
  };

  const generateUpiUrl = (item: any, amt?: number) => {
    const upiId = item.employee.upiId || '';
    const name = encodeURIComponent(item.employee.name);
    const amount = amt !== undefined ? amt : item.calculatedPayout;
    return `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR`;
  };

  const getMonthOptions = () => {
    const options = [];
    const date = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value: `${year}-${month}`, label });
      date.setMonth(date.getMonth() - 1);
    }
    return options;
  };

  const monthOptions = getMonthOptions();

  // Spacing & Spacing Stats computations
  const statsBudget = payrollItems.reduce((acc, item) => acc + item.calculatedPayout, 0);
  const statsPaid = payrollItems.reduce((acc, item) => item.paymentStatus === 'Paid' ? acc + item.calculatedPayout : acc, 0);
  const statsPending = statsBudget - statsPaid;
  const statsSundayClaims = sundayWorkRequests.length;

  // Render Full-Screen Inline Logs Audit View if an employee is selected for audit
  if (activeAuditEmployee) {
    const stats = getEmployeeStats(activeAuditEmployee);

    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 relative animate-in fade-in duration-300">

        {/* Navigation Breadcrumb back button */}
        <div className="flex items-center">
          <button
            onClick={() => setActiveAuditEmployee(null)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group select-none cursor-pointer bg-muted/30 border border-border/80 px-4 py-2 rounded-xl"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Payments Overview
          </button>
        </div>

        {/* Employee Header Details Card */}
        <div className="glass-card rounded-2xl border border-border p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-44 h-44 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm flex-shrink-0">
              {activeAuditEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground leading-snug">{activeAuditEmployee.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{activeAuditEmployee.role} · {activeAuditEmployee.department || 'Unassigned'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="bg-muted/10 rounded-xl px-4 py-2 border border-border text-center flex-1 sm:flex-initial">
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">UPI VPA</span>
              <span className="text-xs font-mono font-bold text-foreground block mt-0.5">{activeAuditEmployee.upiId || 'Not Setup'}</span>
            </div>
            <div className="bg-muted/10 rounded-xl px-4 py-2 border border-border text-center flex-1 sm:flex-initial">
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Base Salary</span>
              <span className="text-xs font-mono font-bold text-emerald-400 block mt-0.5">{formatCurrency(stats.calculatedPayout)}</span>
            </div>
            <div className="bg-primary/5 rounded-xl px-4 py-2 border border-primary/10 text-center flex-1 sm:flex-initial">
              <span className="text-[9px] text-primary font-bold uppercase tracking-wider block">Payable Attendance</span>
              <span className="text-xs font-bold text-foreground block mt-0.5">{stats.totalPayableDays} Days</span>
            </div>
          </div>

        </div>

        {/* Detailed Attendance Audit list container */}
        <div className="glass-card rounded-2xl border border-border shadow-xl overflow-hidden">
          <div className="border-b border-border p-4 bg-muted/20 flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Attendance Logs Sheet for {selectedMonth}</h3>
            <span className="text-[9px] text-muted-foreground font-bold uppercase">Newest records first</span>
          </div>

          <div className="divide-y divide-border/60">
            {(() => {
              const logsMap: Record<string, Attendance> = {};
              attendance.forEach(log => {
                if (log.employeeId === activeAuditEmployee.id || log.employeeId === activeAuditEmployee.employeeId) {
                  const dateParts = log.date.split('-');
                  if (dateParts.length === 3) {
                    const logYear = Number(dateParts[0]);
                    const logMonth = Number(dateParts[1]);
                    if (logYear === selYear && logMonth === selMonth) {
                      logsMap[log.date] = log;
                    }
                  }
                }
              });

              const sheetItems = [];
              for (let d = 1; d <= totalDaysInMonth; d++) {
                const dateStr = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dateObj = new Date(selYear, selMonth - 1, d);
                const isSunday = dateObj.getDay() === 0;
                const log = logsMap[dateStr];

                let label = 'Scheduled';
                let style = 'text-zinc-500 bg-zinc-500/10 border-zinc-500/25';

                if (log) {
                  if (isSunday) {
                    const status = log.sundayReimbursementStatus?.toLowerCase();
                    if (status === 'approved') {
                      label = 'Sunday Duty (Approved)';
                      style = 'text-indigo-400 bg-indigo-400/10 border-indigo-400/25';
                    } else if (status === 'pending') {
                      label = 'Sunday Duty (Pending)';
                      style = 'text-amber-400 bg-amber-400/10 border-amber-400/25 animate-pulse';
                    } else {
                      label = 'Sunday Duty (Rejected)';
                      style = 'text-rose-400 bg-rose-400/10 border-rose-400/25';
                    }
                  } else {
                    label = 'Present';
                    style = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25';
                  }
                } else {
                  if (isSunday) {
                    label = 'Excluded Sunday';
                    style = 'text-slate-400 bg-slate-400/10 border-slate-400/25';
                  } else if (dateStr < localTodayStr) {
                    label = 'Absent';
                    style = 'text-red-400 bg-red-400/10 border-red-400/25';
                  }
                }

                sheetItems.push({
                  date: dateStr,
                  dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
                  label,
                  style,
                  log
                });
              }

              return sheetItems.reverse().map((item) => (
                <div key={item.date} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted/40 border border-border/80 flex flex-col items-center justify-center font-mono text-[9px] font-bold text-muted-foreground leading-none flex-shrink-0">
                      <span>{new Date(item.date).getDate()}</span>
                    </div>
                    <div>
                      <p className="font-bold text-foreground leading-snug">
                        {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <span className={cn('inline-flex text-[9px] font-black uppercase px-2 py-0.5 rounded border mt-1', item.style)}>
                        {item.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1">
                    {item.log ? (
                      <div className="space-y-1 sm:text-right font-mono text-muted-foreground">
                        <p className="flex items-center gap-1.5 justify-end">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          In: {item.log.checkInTime ? new Date(item.log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          <span className="text-border">|</span>
                          Out: {item.log.checkOutTime ? new Date(item.log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                        {item.log.summary && (
                          <div className="p-2.5 rounded-lg border border-border bg-muted/20 text-[10.5px] font-sans text-foreground leading-relaxed max-w-md italic mt-1 text-left">
                            <span className="font-bold text-primary text-[9px] block uppercase not-italic tracking-wider mb-0.5">Work Completed</span>
                            "{item.log.summary}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="italic text-muted-foreground font-mono">No duty records registered</span>
                    )}
                  </div>

                </div>
              ));
            })()}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 relative animate-in fade-in duration-300">

      {/* Navigation Breadcrumbs Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group select-none"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </Link>
      </div>

      <PageHeader
        title="Payments Management"
        subtitle="Process employee monthly payrolls, audit work logs, generate instant UPI QR payouts, and approve Sunday claims"
      />

      {/* Dynamic Summary Metrics Cards for Visual Spacing & Structuring */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        {/* Card 1: Total Payroll */}
        <div className="glass-card rounded-2xl border border-border p-4 shadow-md flex items-center gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Payroll</span>
            <span className="text-lg font-black text-foreground font-mono mt-0.5 block">{formatCurrency(statsBudget)}</span>
          </div>
        </div>

        {/* Card 2: Paid Salaries */}
        <div className="glass-card rounded-2xl border border-border p-4 shadow-md flex items-center gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Paid Salaries</span>
            <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">{formatCurrency(statsPaid)}</span>
          </div>
        </div>

        {/* Card 3: Pending Payroll */}
        <div className="glass-card rounded-2xl border border-border p-4 shadow-md flex items-center gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Pending Payroll</span>
            <span className="text-lg font-black text-rose-400 font-mono mt-0.5 block">{formatCurrency(statsPending)}</span>
          </div>
        </div>

        {/* Card 4: Sunday claims pending */}
        <div className="glass-card rounded-2xl border border-border p-4 shadow-md flex items-center gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Sunday Claims</span>
            <span className="text-lg font-black text-indigo-400 font-mono mt-0.5 block">
              {statsSundayClaims} Pending Shift{statsSundayClaims !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

      </div>

      {/* Tabs and filters header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-3">

        {/* Tabs switcher */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/20 border border-border/60">
          <button
            onClick={() => setActiveTab('payroll')}
            className={cn(
              'h-9 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer',
              activeTab === 'payroll'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Payroll & Payments Overview
          </button>
          <button
            onClick={() => setActiveTab('sundays')}
            className={cn(
              'h-9 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'sundays'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Sunday Reimbursements
            {sundayWorkRequests.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500 text-white rounded-full animate-bounce">
                {sundayWorkRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Global Search and Month selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Month selector */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-10 px-3.5 pr-8 rounded-xl border border-border bg-card text-xs text-foreground outline-none focus:border-primary cursor-pointer appearance-none"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="absolute right-3 top-3.5 pointer-events-none text-muted-foreground">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-60 h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-xs text-foreground outline-none focus:border-primary"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          </div>
        </div>

      </div>

      {/* Main content grid */}
      <div className="glass-card rounded-2xl border border-border shadow-xl overflow-hidden min-h-[50vh]">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-xs text-muted-foreground font-medium">Aggregating real-time records...</p>
          </div>
        ) : activeTab === 'payroll' ? (

          /* Tab 1: Payroll Management */
          <div className="overflow-x-auto">
            {payrollItems.length === 0 ? (
              <div className="text-center py-20">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-sm font-bold text-foreground">No employees found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  We couldn't identify any records matching your search queries. Verify employee configuration.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[1150px]">
                <thead>
                  <tr className="bg-muted/10 border-b border-border/80 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    <th className="py-4 px-5">Employee Info</th>
                    <th className="py-4 px-3 text-center">Present</th>
                    <th className="py-4 px-3 text-center">Absent</th>
                    <th className="py-4 px-3 text-center">Sundays</th>
                    <th className="py-4 px-3 text-center font-bold bg-muted/5">Payable Days</th>
                    <th className="py-4 px-4">UPI Coordinates (VPA)</th>
                    <th className="py-4 px-4 text-center">Base Salary</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {payrollItems.map((item) => (
                    <tr key={item.employee.id} className="hover:bg-muted/5 transition-colors">

                      {/* Name & ID */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-[10px] flex-shrink-0">
                            {item.employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-foreground leading-snug">{item.employee.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{item.employee.employeeId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Present Days */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                        {item.presentDays}
                      </td>

                      {/* Absent Days */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-red-400">
                        {item.absentDays}
                      </td>

                      {/* Sundays Approved */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-indigo-400">
                            {item.sundayWorkedCount}
                          </span>
                          {item.sundayPendingCount > 0 && (
                            <span className="text-[9px] text-amber-400 font-semibold px-1 rounded bg-amber-500/10 border border-amber-500/25 mt-0.5 animate-pulse">
                              {item.sundayPendingCount} Claim{item.sundayPendingCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Payable Days */}
                      <td className="py-3 px-3 text-center font-mono font-black text-foreground text-sm bg-muted/5">
                        {item.totalPayableDays}
                      </td>

                      {/* UPI Coordinates (VPA) */}
                      <td className="py-3 px-4 min-w-[180px]">
                        {editingUpiEmpId === item.employee.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={upiEditValue}
                              onChange={(e) => setUpiEditValue(e.target.value)}
                              className="h-8 px-2.5 rounded-lg border border-primary bg-card outline-none text-xs flex-1 text-foreground"
                            />
                            <button
                              onClick={() => handleSaveInlineUpi(item.employee.id)}
                              className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center cursor-pointer hover:bg-emerald-500/20"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingUpiEmpId(null)}
                              className="h-8 w-8 rounded-lg border border-border hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span className="font-mono font-semibold text-foreground truncate max-w-[140px]">
                              {item.employee.upiId || 'Not Configured'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingUpiEmpId(item.employee.id);
                                setUpiEditValue(item.employee.upiId || '');
                              }}
                              className="p-1 rounded bg-muted/20 border border-border/80 text-muted-foreground hover:text-foreground cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Base Salary */}
                      <td className="py-3 px-4 text-center font-bold text-foreground">
                        <span className="text-sm font-black">{formatCurrency(item.employee.salary)}</span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full border',
                          item.paymentStatus === 'Paid' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                            item.paymentStatus === 'Processing' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20 animate-pulse' :
                              'text-rose-400 bg-rose-400/10 border-rose-400/20'
                        )}>
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            item.paymentStatus === 'Paid' ? 'bg-emerald-400' :
                              item.paymentStatus === 'Processing' ? 'bg-amber-400' :
                                'bg-rose-400'
                          )} />
                          {item.paymentStatus}
                        </span>
                      </td>

                      {/* Action Button coordinates - Direct paid/unpaid toggle with no popups */}
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2.5">

                          {/* Main inline toggle action */}
                          {item.paymentStatus === 'Paid' ? (
                            <button
                              onClick={() => handleTogglePaymentStatus(item, false)}
                              className="inline-flex items-center justify-center h-8 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-black transition-all cursor-pointer shadow-sm hover:shadow-md border border-rose-600/25 select-none"
                            >
                              Mark Unpaid
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTogglePaymentStatus(item, true)}
                              className="inline-flex items-center justify-center h-8 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black transition-all cursor-pointer shadow-sm hover:shadow-md border border-emerald-600/25 select-none"
                            >
                              Mark Paid
                            </button>
                          )}

                          {/* Secondary Payout/Audit coordinates */}
                          <button
                            onClick={() => {
                              setActivePayoutEmployee(item);
                              setCustomPayoutAmount(item.calculatedPayout);
                            }}
                            disabled={!item.employee.upiId}
                            title={!item.employee.upiId ? 'Setup VPA ID first' : 'Scan Payout QR Code'}
                            className="h-8 w-8 rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-400 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setActiveAuditEmployee(item.employee)}
                            title="Audit Monthly Logs"
                            className="h-8 w-8 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        ) : (

          /* Tab 2: Sunday Reimbursements */
          <div className="p-6">
            {sundayWorkRequests.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h4 className="text-sm font-bold text-foreground">All Sunday duties audited!</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  There are no pending Sunday reimbursement requests remaining for audit in {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sundayWorkRequests.map((item) => (
                  <div key={item.log.id} className="glass-card rounded-2xl border border-border/80 p-5 shadow-lg flex flex-col justify-between hover:border-primary/40 transition-colors">

                    <div>
                      {/* Employee details */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-xs flex-shrink-0">
                          {item.employee?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-xs leading-snug">{item.employee?.name}</p>
                          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{item.employee?.employeeId} — {item.employee?.department}</p>
                        </div>
                      </div>

                      {/* Log details */}
                      <div className="space-y-2 bg-muted/10 rounded-xl p-3 border border-border/60 text-xs mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Duty Date</span>
                          <span className="font-bold text-foreground">
                            {new Date(item.log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Log timings</span>
                          <span className="font-mono text-[10.5px]">
                            {new Date(item.log.checkInTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.log.checkOutTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Logged Hours</span>
                          <span className="font-mono font-bold text-foreground">
                            {getElapsedTime(item.log.checkInTime, item.log.checkOutTime)}
                          </span>
                        </div>
                      </div>

                      {/* Work Description */}
                      <div className="space-y-1 text-xs mb-4">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase block tracking-wider">Work Accomplished</span>
                        <p className="text-foreground leading-relaxed font-medium line-clamp-3">
                          {item.log.summary}
                        </p>
                      </div>

                      {/* Sunday Notes */}
                      {item.log.sundayNotes && (
                        <div className="space-y-1 text-xs mb-4">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase block tracking-wider">Employee Notes</span>
                          <p className="text-muted-foreground leading-relaxed italic">
                            "{item.log.sundayNotes}"
                          </p>
                        </div>
                      )}

                    </div>

                    <div className="pt-2 border-t border-border/40 mt-2">
                      <button
                        onClick={() => {
                          setReviewShift(item.log);
                          setAdminRemarks('');
                        }}
                        className="w-full h-9 rounded-lg bg-indigo-500 hover:bg-indigo-500/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Audit shift & Approve
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        )}

      </div>

      {/* Pay Now UPI Dialog */}
      {activePayoutEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-2xl border border-border shadow-2xl max-w-sm w-full p-6 animate-in scale-in duration-200 text-center">

            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4.5 h-4.5 text-indigo-400" />
                UPI Payout Coordinates
              </span>
              <button
                onClick={() => setActivePayoutEmployee(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Box */}
            <div className="bg-muted/10 border border-border rounded-xl p-4 mb-4 text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">To Name</span>
                <span className="font-extrabold text-foreground">{activePayoutEmployee.employee.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">UPI Address (VPA)</span>
                <span className="font-mono font-bold text-foreground text-[11px] truncate max-w-[180px]">{activePayoutEmployee.employee.upiId}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Payable Attendance</span>
                <span className="font-mono font-bold text-foreground">{activePayoutEmployee.totalPayableDays} Days ({activePayoutEmployee.presentDays}wd + {activePayoutEmployee.sundayWorkedCount}sd)</span>
              </div>
              <div className="border-t border-border/50 pt-2 flex justify-between items-center">
                <span className="text-xs font-bold text-foreground uppercase">Base Salary Payout</span>
                <span className="text-sm font-bold text-muted-foreground font-mono">{formatCurrency(activePayoutEmployee.calculatedPayout)}</span>
              </div>
            </div>

            {/* Input to Customize Salary Payout */}
            <div className="mb-4 text-left space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Calculated Salary to Pay (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-muted-foreground font-mono">
                  ₹
                </span>
                <input
                  type="number"
                  value={customPayoutAmount}
                  onChange={(e) => setCustomPayoutAmount(Number(e.target.value))}
                  placeholder="Enter payout amount"
                  className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-border bg-card text-xs font-bold font-mono text-emerald-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Generated QR Code */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-border shadow-inner mx-auto max-w-[210px] mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(generateUpiUrl(activePayoutEmployee, customPayoutAmount))}`}
                alt="UPI Payout QR Code"
                className="w-44 h-44 object-contain"
              />
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed max-w-xs mx-auto mb-5">
              Scan this dynamic QR code using any UPI app (GPay, PhonePe, Paytm) to pay the net amount instantly.
            </p>

            <div className="flex items-center gap-3">
              <a
                href={generateUpiUrl(activePayoutEmployee, customPayoutAmount)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Deep-Link Pay
              </a>
              <button
                onClick={() => {
                  handleTogglePaymentStatus(activePayoutEmployee, true, customPayoutAmount);
                  setActivePayoutEmployee(null);
                }}
                className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                Mark as Paid
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Audit Expandable Sunday Shift Claim Modal */}
      {reviewShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-2xl border border-border shadow-2xl max-w-md w-full p-6 animate-in scale-in duration-200">

            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                Sunday Extra Shift Claim Audit
              </span>
              <button
                onClick={() => setReviewShift(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">

              <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-2 text-xs">
                <p className="text-muted-foreground">Duty date: <span className="font-bold text-foreground">{reviewShift.date}</span></p>
                <p className="text-muted-foreground">Logged timings: <span className="font-mono text-[10.5px]">{new Date(reviewShift.checkInTime || '').toLocaleTimeString()} - {new Date(reviewShift.checkOutTime || '').toLocaleTimeString()}</span></p>
                <p className="text-muted-foreground">Work completed: <span className="font-bold text-foreground">{reviewShift.summary}</span></p>
                {reviewShift.sundayNotes && (
                  <p className="text-muted-foreground">Employee Notes: <span className="text-foreground italic">"{reviewShift.sundayNotes}"</span></p>
                )}
              </div>

              {/* Feedback Remarks */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Admin Audit Remarks</label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="e.g. Excellent work, reimbursement approved for payout."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-border bg-card text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleReviewSundayShift(true)}
                  disabled={reviewLoading}
                  className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-500/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Approve Duty Claim
                </button>
                <button
                  onClick={() => handleReviewSundayShift(false)}
                  disabled={reviewLoading}
                  className="flex-1 h-10 rounded-xl bg-rose-500 hover:bg-rose-500/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Reject Duty Claim
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
