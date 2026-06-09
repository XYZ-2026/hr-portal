'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToastContext } from '@/components/providers/ToastProvider';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import {
  Clock,
  Play,
  Square,
  FileText,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Check,
  X,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Employee, Attendance } from '@/types';

type ShiftStatus = 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'SHIFT_COMPLETED';

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const toast = useToastContext();

  const [employeeProfile, setEmployeeProfile] = useState<Employee | null>(null);
  const [todayLog, setTodayLog] = useState<Attendance | null>(null);
  const [monthlyLogs, setMonthlyLogs] = useState<Attendance[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [summary, setSummary] = useState('');

  // Sunday modal states
  const [showSundayModal, setShowSundayModal] = useState(false);
  const [sundayNotes, setSundayNotes] = useState('');

  // UPI ID states
  const [upiInput, setUpiInput] = useState('');
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [upiLoading, setUpiLoading] = useState(false);

  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateString();
  const isTodaySunday = new Date().getDay() === 0;

  // Real-time monthly logs sync
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'attendance'),
      where('employeeId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Attendance[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Attendance);
      });
      setMonthlyLogs(list);
    }, (err) => {
      console.error('Real-time attendance subscription failed:', err);
    });
    return () => unsubscribe();
  }, [user]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      const profileDoc = await getDoc(doc(db, 'employees', user.uid));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data() as Employee;
        setEmployeeProfile(profileData);
        setUpiInput(profileData.upiId || '');
      }

      // Fetch attendance log directly
      const docId = `${user.uid}_${todayStr}`;
      const todayDoc = await getDoc(doc(db, 'attendance', docId));
      let currentTodayLog: Attendance | null = null;

      if (todayDoc.exists()) {
        currentTodayLog = todayDoc.data() as Attendance;
      }

      setTodayLog(currentTodayLog);

      if (currentTodayLog) {
        setSummary(currentTodayLog.summary || '');
        setSundayNotes(currentTodayLog.sundayNotes || '');
      }
    } catch (err) {
      console.error('Failed to load employee dashboard data:', err);
      toast.error('Error', 'Could not load your workspace data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [user, todayStr, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getShiftStatus = (): ShiftStatus => {
    if (!todayLog) return 'NOT_CHECKED_IN';
    if (!todayLog.checkOutTime) return 'CHECKED_IN';
    return 'SHIFT_COMPLETED';
  };

  const shiftStatus = getShiftStatus();

  const handleCheckIn = async () => {
    if (!user) return;
    setActionLoading(true);

    const fallbackName = employeeProfile?.name || user.displayName || user.email?.split('@')[0] || 'Employee';
    const docId = `${user.uid}_${todayStr}`;

    const newLog: Attendance = {
      id: docId,
      employeeId: user.uid,
      employeeName: fallbackName,
      date: todayStr,
      checkInTime: new Date().toISOString(),
      status: 'present',
      isSunday: isTodaySunday,
      sundayReimbursementStatus: isTodaySunday ? 'none' : 'none',
    };

    try {
      await setDoc(doc(db, 'attendance', docId), newLog);
      setTodayLog(newLog);
      toast.success(
        isTodaySunday ? 'Sunday Shift Started!' : 'Successfully Checked In!',
        isTodaySunday ? 'Sunday Work extra shift has started.' : 'Your daily work shift has started.'
      );
    } catch (err) {
      console.error(err);
      toast.error('Check-In Failed', 'An error occurred during check-in. Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user || !todayLog) return;

    if (!summary.trim()) {
      toast.error('Work Summary Required', 'Please explain what work was done by you on this particular day before clocking out.');
      return;
    }

    if (isTodaySunday && !showSundayModal) {
      setShowSundayModal(true);
      return;
    }

    setActionLoading(true);
    const docId = `${user.uid}_${todayStr}`;
    const updates: Partial<Attendance> = {
      checkOutTime: new Date().toISOString(),
      summary: summary.trim(),
      ...(isTodaySunday ? {
        isSunday: true,
        sundayReimbursementStatus: 'pending',
        sundayNotes: sundayNotes.trim() || '',
      } : {})
    };

    try {
      await updateDoc(doc(db, 'attendance', docId), updates);

      const updatedLog = { ...todayLog, ...updates } as Attendance;
      setTodayLog(updatedLog);
      setShowSundayModal(false);
      toast.success(
        isTodaySunday ? 'Sunday Extra Shift Registered!' : 'Successfully Checked Out!',
        isTodaySunday
          ? 'Your Sunday shift has been registered and sent to admin for reimbursement approval.'
          : 'Good work today! Your work summary is securely logged.'
      );
    } catch (err) {
      console.error(err);
      toast.error('Check-Out Failed', 'An error occurred during check-out. Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveUpi = async () => {
    if (!user) return;

    const formattedUpi = upiInput.trim();
    if (!formattedUpi) {
      toast.error('Invalid UPI', 'Please enter a valid UPI ID (e.g. name@bank)');
      return;
    }

    if (!formattedUpi.includes('@')) {
      toast.error('Invalid UPI ID Format', 'UPI ID must contain the "@" symbol.');
      return;
    }

    setUpiLoading(true);
    try {
      const employeeData: any = {
        upiId: formattedUpi
      };
      
      // If employee profile doesn't exist yet, initialize standard default fields from user auth
      if (!employeeProfile) {
        employeeData.id = user.uid;
        employeeData.employeeId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
        employeeData.name = user.displayName || user.email?.split('@')[0] || 'Employee';
        employeeData.email = user.email || '';
        employeeData.status = 'Active';
        employeeData.joiningDate = new Date().toISOString().split('T')[0];
        employeeData.role = 'Employee';
        employeeData.department = 'Engineering';
        employeeData.salary = 0;
      }

      await setDoc(doc(db, 'employees', user.uid), employeeData, { merge: true });
      
      setEmployeeProfile(prev => {
        if (prev) return { ...prev, upiId: formattedUpi };
        return {
          id: user.uid,
          employeeId: employeeData.employeeId,
          name: employeeData.name,
          email: employeeData.email,
          role: employeeData.role,
          department: employeeData.department,
          salary: employeeData.salary,
          joiningDate: employeeData.joiningDate,
          status: employeeData.status,
          upiId: formattedUpi
        } as Employee;
      });
      
      setIsEditingUpi(false);
      toast.success('UPI ID Secured', 'Your payout UPI ID is now securely stored.');
    } catch (err) {
      console.error('Failed to update UPI:', err);
      toast.error('Update Failed', 'An error occurred while saving your UPI ID.');
    } finally {
      setUpiLoading(false);
    }
  };

  // Calculations for current month attendance statistics card
  const getMonthStats = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();

    let sundaysCount = 0;
    let presentCount = 0;
    let sundayWorkedApproved = 0;
    let sundayWorkedPending = 0;

    const logsMap: Record<string, Attendance> = {};
    monthlyLogs.forEach(log => {
      // Filter for current month only
      const logDate = new Date(log.date);
      if (logDate.getFullYear() === year && logDate.getMonth() === month) {
        logsMap[log.date] = log;
      }
    });

    for (let d = 1; d <= numDays; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      if (dayOfWeek === 0) {
        sundaysCount++;
        const log = logsMap[dateStr];
        if (log && log.checkInTime && log.checkOutTime) {
          if (log.sundayReimbursementStatus === 'approved') {
            sundayWorkedApproved++;
          } else if (log.sundayReimbursementStatus === 'pending') {
            sundayWorkedPending++;
          }
        }
      } else {
        const log = logsMap[dateStr];
        // If checked in on a weekday, it counts as present (if it has checkout, or if it is today)
        if (log && log.checkInTime) {
          if (log.checkOutTime || dateStr === todayStr) {
            presentCount++;
          }
        }
      }
    }

    const workingDays = numDays - sundaysCount;
    // Absent days = Working Days - Present Days
    const absentDays = Math.max(0, workingDays - presentCount);
    const attendancePercentage = workingDays > 0
      ? Math.round((presentCount / workingDays) * 100)
      : 0;

    return {
      workingDays,
      presentDays: presentCount,
      absentDays,
      sundays: sundaysCount,
      sundayWorkedApproved,
      sundayWorkedPending,
      attendancePercentage,
    };
  };

  const stats = getMonthStats();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-semibold text-muted-foreground">Loading employee workspace...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 relative animate-in fade-in duration-300">

      <PageHeader
        title="Employee Portal"
        subtitle="Manage your daily shift attendance, Sunday extra duties, and secure payment coordinates"
      />

      {/* Stats Row & UPI Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Attendance stats card */}
        <div className="lg:col-span-2 glass-card rounded-2xl border border-border p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Attendance Summary</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider rounded-md bg-primary/10 border border-primary/20 text-primary">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

              <div className="bg-muted/10 rounded-xl p-3 border border-border">
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Total Work Days</span>
                <span className="text-xl font-extrabold text-foreground font-mono mt-1 block">{stats.workingDays}</span>
                <span className="text-[9px] text-muted-foreground mt-0.5 block">Excl. {stats.sundays} Sundays</span>
              </div>

              <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">Days Present</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono mt-1 block">{stats.presentDays}</span>
                <span className="text-[9px] text-muted-foreground mt-0.5 block">On-time weekdays</span>
              </div>

              <div className="bg-red-500/5 rounded-xl p-3 border border-red-500/10">
                <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider block">Days Absent</span>
                <span className="text-xl font-extrabold text-red-400 font-mono mt-1 block">{stats.absentDays}</span>
                <span className="text-[9px] text-muted-foreground mt-0.5 block">Unchecked weekdays</span>
              </div>

              <div className="bg-indigo-500/5 rounded-xl p-3 border border-indigo-500/10">
                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">Sundays Worked</span>
                <span className="text-xl font-extrabold text-indigo-400 font-mono mt-1 block">
                  {stats.sundayWorkedApproved}
                </span>
                <span className="text-[9px] text-muted-foreground mt-0.5 block">
                  {stats.sundayWorkedPending > 0 ? `(${stats.sundayWorkedPending} Pending Review)` : 'Reimbursements approved'}
                </span>
              </div>

            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Monthly Attendance Percentage:</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    stats.attendancePercentage >= 90 ? 'bg-emerald-500' : stats.attendancePercentage >= 75 ? 'bg-primary' : 'bg-amber-500'
                  )}
                  style={{ width: `${stats.attendancePercentage}%` }}
                />
              </div>
              <span className="text-sm font-black text-foreground font-mono">{stats.attendancePercentage}%</span>
            </div>
          </div>

        </div>

        {/* UPI Setup Card */}
        <div className="glass-card rounded-2xl border border-border p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4.5 h-4.5 text-primary" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">UPI Coordinate Setup</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Register your personal UPI Virtual Payment Address (VPA) to enable direct payroll and extra duty reimbursements.
            </p>
          </div>

          <div className="mt-4">
            {isEditingUpi ? (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={upiInput}
                    onChange={(e) => setUpiInput(e.target.value)}
                    placeholder="Enter UPI ID (e.g. name@bank)"
                    disabled={upiLoading}
                    className="w-full h-10 px-3.5 pr-10 rounded-xl border border-primary/30 bg-muted/20 text-xs text-foreground outline-none focus:border-primary focus:bg-background transition-all"
                  />
                  {upiLoading && <Loader2 className="absolute right-3 top-3 w-4 h-4 text-primary animate-spin" />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveUpi}
                    disabled={upiLoading}
                    className="flex-1 h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save VPA
                  </button>
                  <button
                    onClick={() => {
                      setUpiInput(employeeProfile?.upiId || '');
                      setIsEditingUpi(false);
                    }}
                    disabled={upiLoading}
                    className="h-9 w-9 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-muted/10 rounded-xl p-3 border border-border/80 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase block font-medium">Active UPI ID</span>
                  <span className="text-xs font-mono font-bold text-foreground truncate max-w-[150px] block mt-0.5">
                    {employeeProfile?.upiId || 'Not Configured'}
                  </span>
                </div>
                <button
                  onClick={() => setIsEditingUpi(true)}
                  className="h-8 px-3 rounded-lg border border-primary/20 hover:bg-primary/10 text-xs font-bold text-primary transition-all cursor-pointer"
                >
                  Configure
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Main Shift Log Panel */}
      <div className="glass-card rounded-2xl border border-border shadow-xl max-w-2xl mx-auto overflow-hidden">

        {/* Panel Header */}
        <div className="border-b border-border p-5 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                Active Shift {isTodaySunday && <span className="text-indigo-400 ml-1">(Sunday Extra Shift)</span>}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {shiftStatus === 'NOT_CHECKED_IN' && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-zinc-500/20 bg-zinc-500/10 text-zinc-400">
              Offline
            </span>
          )}
          {shiftStatus === 'CHECKED_IN' && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 animate-pulse">
              On Shift
            </span>
          )}
          {shiftStatus === 'SHIFT_COMPLETED' && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary">
              Completed
            </span>
          )}
        </div>

        {/* Panel Content */}
        <div className="p-6 sm:p-8">

          {/* 1. NOT CHECKED IN STATE */}
          {shiftStatus === 'NOT_CHECKED_IN' && (
            <div className="text-center py-8 flex flex-col items-center animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-xl shadow-primary/25 relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-ping group-hover:animate-none pointer-events-none" />
                <Play className="w-6 h-6 text-primary-foreground translate-x-0.5 fill-current" />
              </div>
              <h3 className="text-base font-bold text-foreground">Ready to clock in today?</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-6 leading-relaxed">
                Clocking in logs your check-in. Once your daily shift is complete, write a summary and clock out.
              </p>
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className={cn(
                  'h-11 px-6 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap flex-nowrap select-none',
                  'bg-primary text-primary-foreground transition-all duration-200',
                  'hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25',
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>Starting shift...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 flex-shrink-0" />
                    <span>Start Shift (Check In)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 2. ACTIVE SHIFT: CHECKED IN */}
          {shiftStatus === 'CHECKED_IN' && (
            <div className="animate-in fade-in duration-300 space-y-6">

              <div className="flex items-center gap-3.5 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-400">Shift Started Successfully</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Click the Checkout button below once you complete your daily work.
                  </p>
                </div>
              </div>

              {isTodaySunday && (
                <div className="flex items-start gap-3.5 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                  <Info className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-indigo-400">Sunday Reimbursement Eligible</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      This is an extra duty shift. On clock-out, you will be prompted to submit a summary of work completed for admin approval.
                    </p>
                  </div>
                </div>
              )}

              {/* Work Summary Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    Daily Work Summary
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {summary.length} characters
                  </span>
                </div>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Provide a summary of what work was done by you on this particular day..."
                  rows={4}
                  className={cn(
                    'w-full p-4 rounded-xl border border-border bg-muted/10 outline-none text-sm text-foreground',
                    'placeholder:text-muted-foreground/60 transition-all focus:border-primary/50 focus:bg-background'
                  )}
                />
                <p className="text-[10px] text-muted-foreground italic">
                  * Note: Providing a summary is mandatory to complete your checkout and shifts logging.
                </p>

                {/* Checkout button */}
                <div className="pt-2">
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className={cn(
                      'h-11 px-6 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto whitespace-nowrap flex-nowrap select-none',
                      'bg-primary text-primary-foreground transition-all duration-200',
                      'hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25',
                      'disabled:opacity-60 disabled:cursor-not-allowed'
                    )}
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                        <span>Saving Shift...</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current flex-shrink-0" />
                        <span>Check Out & Save Log</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* 3. SHIFT COMPLETED STATE */}
          {shiftStatus === 'SHIFT_COMPLETED' && (
            <div className="space-y-6 animate-in fade-in duration-300">

              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-primary">Shift Log Completed</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Your attendance and summary log have been registered for today.
                  </p>
                </div>
              </div>

              {/* Logged Summary Box */}
              <div className="p-5 rounded-xl border border-border bg-muted/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-2">
                  <FileText className="w-4 h-4" />
                  Your Submitted Work Summary
                </span>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {todayLog?.summary}
                </p>
              </div>

              {todayLog?.isSunday && (
                <div className="p-5 rounded-xl border border-indigo-500/10 bg-indigo-500/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4" />
                    Sunday Extra Shift Details
                  </span>
                  <div className="space-y-2 text-xs">
                    <p className="text-muted-foreground">
                      Status: <span className={cn(
                        'font-bold ml-1 px-2 py-0.5 rounded text-[10px] uppercase',
                        todayLog.sundayReimbursementStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                          todayLog.sundayReimbursementStatus === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                      )}>
                        {todayLog.sundayReimbursementStatus || 'pending'}
                      </span>
                    </p>
                    {todayLog.sundayNotes && (
                      <p className="text-muted-foreground">
                        Notes: <span className="text-foreground">{todayLog.sundayNotes}</span>
                      </p>
                    )}
                    {todayLog.sundayRemarks && (
                      <p className="text-indigo-400 font-medium">
                        Admin Feedback: <span className="text-foreground">{todayLog.sundayRemarks}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sunday Checkout Confirmation Modal */}
      {showSundayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-2xl border border-border shadow-2xl max-w-lg w-full p-6 animate-in scale-in duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h3 className="text-sm font-bold text-foreground">Sunday Extra Shift Reimbursement Summary</h3>
              </div>
              <button
                onClick={() => setShowSundayModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex items-start gap-2.5">
                <Info className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  This Sunday shift counts separately from your standard working days and is eligible for extra duty payout. Provide additional context or notes to speed up admin review.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Summary of Tasks Completed (Mandatory)
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Summarize the core tasks and accomplishments..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-border bg-muted/10 outline-none text-xs text-foreground focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Optional Sunday Work Notes
                </label>
                <textarea
                  value={sundayNotes}
                  onChange={(e) => setSundayNotes(e.target.value)}
                  placeholder="Add any specific details or remarks for the review team (optional)..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-border bg-muted/10 outline-none text-xs text-foreground focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Submit Reimbursement & Clock Out
                </button>
                <button
                  onClick={() => setShowSundayModal(false)}
                  disabled={actionLoading}
                  className="h-10 px-4 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
