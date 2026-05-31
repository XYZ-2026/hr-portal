'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToastContext } from '@/components/providers/ToastProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  Calendar,
  Clock,
  FileText,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Info,
  CalendarDays,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Attendance } from '@/types';

interface HistoryItem {
  date: string;
  dayName: string;
  isSunday: boolean;
  status: 'present' | 'absent' | 'sunday_excluded' | 'sunday_worked_approved' | 'sunday_worked_pending' | 'sunday_worked_rejected' | 'future';
  checkInTime?: string;
  checkOutTime?: string;
  summary?: string;
  sundayNotes?: string;
  sundayRemarks?: string;
}

export default function EmployeeHistoryPage() {
  const { user } = useAuth();
  const toast = useToastContext();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Get current local date parameters
  const getLocalDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60 * 1000);
  };

  const localNow = getLocalDate();
  const currentYearStr = String(localNow.getFullYear());
  const currentMonthStr = String(localNow.getMonth() + 1).padStart(2, '0');

  // Filters State
  const [selectedMonth, setSelectedMonth] = useState(`${currentYearStr}-${currentMonthStr}`);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchDate, setSearchDate] = useState<string>('');

  // Setup real-time listener for all attendance records
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(
      collection(db, 'attendance'),
      where('employeeId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Attendance[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Attendance);
      });
      // Sort by date descending
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLogs(list);
      setLoading(false);
    }, (err) => {
      console.error('Failed to subscribe to attendance logs:', err);
      toast.error('Sync Error', 'Could not sync attendance history in real time.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  // Construct dynamic list of days for the selected month with active/inactive logs
  const getMonthlyItems = (): HistoryItem[] => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const numDays = new Date(year, month, 0).getDate();

    const todayLocalStr = localNow.toISOString().split('T')[0];

    const logsMap: Record<string, Attendance> = {};
    logs.forEach(log => {
      logsMap[log.date] = log;
    });

    const items: HistoryItem[] = [];

    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, d);
      const isSunday = dateObj.getDay() === 0;
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

      const log = logsMap[dateStr];
      const isPast = dateStr < todayLocalStr;
      const isToday = dateStr === todayLocalStr;

      let status: HistoryItem['status'] = 'future';
      let checkInTime = log?.checkInTime;
      let checkOutTime = log?.checkOutTime;
      let summary = log?.summary;

      if (log) {
        if (isSunday) {
          if (log.sundayReimbursementStatus === 'approved') {
            status = 'sunday_worked_approved';
          } else if (log.sundayReimbursementStatus === 'pending') {
            status = 'sunday_worked_pending';
          } else if (log.sundayReimbursementStatus === 'rejected') {
            status = 'sunday_worked_rejected';
          } else {
            status = 'sunday_worked_pending'; // Sunday log without approval status is pending
          }
        } else {
          // Weekday present
          status = 'present';
        }
      } else {
        if (isSunday) {
          status = 'sunday_excluded';
        } else if (isPast) {
          status = 'absent';
        } else if (isToday) {
          status = 'absent'; // absent if today is still not checked in and it's not a Sunday
        } else {
          status = 'future';
        }
      }

      items.push({
        date: dateStr,
        dayName,
        isSunday,
        status,
        checkInTime,
        checkOutTime,
        summary,
        sundayNotes: log?.sundayNotes,
        sundayRemarks: log?.sundayRemarks,
      });
    }

    // Sort: newest dates first
    return items.reverse();
  };

  const allItems = getMonthlyItems();

  // Filter items
  const filteredItems = allItems.filter(item => {
    // 1. Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'present' && item.status !== 'present') return false;
      if (statusFilter === 'absent' && item.status !== 'absent') return false;
      if (statusFilter === 'sunday_worked' &&
        !['sunday_worked_approved', 'sunday_worked_pending', 'sunday_worked_rejected'].includes(item.status)) return false;
      if (statusFilter === 'sunday_excluded' && item.status !== 'sunday_excluded') return false;
    }

    // 2. Search Date
    if (searchDate) {
      if (item.date !== searchDate) return false;
    }

    return true;
  });

  const toggleExpand = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getElapsedTime = (inStr?: string, outStr?: string) => {
    if (!inStr || !outStr) return '—';
    const diffMs = new Date(outStr).getTime() - new Date(inStr).getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: HistoryItem['status']) => {
    switch (status) {
      case 'present':
        return (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            Present
          </span>
        );
      case 'absent':
        return (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-red-500/20 bg-red-500/10 text-red-400">
            Absent
          </span>
        );
      case 'sunday_excluded':
        return (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-zinc-500/25 bg-zinc-500/10 text-zinc-400">
            Sunday Excluded
          </span>
        );
      case 'sunday_worked_approved':
        return (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            Sunday Worked (Approved)
          </span>
        );
      case 'sunday_worked_pending':
        return (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 animate-pulse">
            Sunday Worked (Pending)
          </span>
        );
      case 'sunday_worked_rejected':
        return (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-400">
            Reimbursement Rejected
          </span>
        );
      case 'future':
        return (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-zinc-500/10 bg-zinc-500/5 text-zinc-500">
            Scheduled
          </span>
        );
    }
  };

  // Generate Year-Month string arrays for filters (past 12 months)
  const getMonthOptions = () => {
    const options = [];
    const date = new Date(localNow.getFullYear(), localNow.getMonth(), 1);
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

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 relative animate-in fade-in duration-300">

      <PageHeader
        title="My Attendance History"
        subtitle="Review your historical monthly attendance coordinates, clock schedules, and Sunday duty reimbursements"
      />

      {/* Filters Command Center */}
      <div className="glass-card rounded-2xl p-5 border border-border shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Month Picker */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            Filter Month
          </label>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-border bg-card text-xs text-foreground outline-none focus:border-primary transition-all cursor-pointer appearance-none"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="absolute right-3.5 top-3.5 pointer-events-none text-muted-foreground">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-primary" />
            Filter Status
          </label>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-border bg-card text-xs text-foreground outline-none focus:border-primary transition-all cursor-pointer appearance-none"
            >
              <option value="all">All Days</option>
              <option value="present">Present (Weekdays)</option>
              <option value="absent">Absent</option>
              <option value="sunday_worked">Sunday Duties</option>
              <option value="sunday_excluded">Excluded Sundays</option>
            </select>
            <div className="absolute right-3.5 top-3.5 pointer-events-none text-muted-foreground">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Date Finder Search */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-primary" />
            Search Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-border bg-card text-xs text-foreground outline-none focus:border-primary transition-all cursor-pointer"
            />
            {searchDate && (
              <button
                onClick={() => setSearchDate('')}
                className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Main Attendance List */}
      <div className="glass-card rounded-2xl border border-border shadow-xl overflow-hidden">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-xs text-muted-foreground font-medium">Syncing database registers...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground shadow-inner">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-foreground">No matching logs discovered</h4>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-2 leading-relaxed">
              We couldn't identify any attendance registers matching your search coordinates. Adjust your filters or verify the selected month.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">

            {filteredItems.map((item) => {
              const isExpanded = !!expandedDates[item.date];
              const hasSummary = !!item.summary || !!item.sundayNotes || !!item.sundayRemarks;
              const hasTimings = !!item.checkInTime;

              return (
                <div
                  key={item.date}
                  className={cn(
                    'transition-colors hover:bg-muted/5 p-4 sm:p-5 flex flex-col gap-4',
                    item.status === 'absent' && 'bg-red-500/[0.01]',
                    item.status.startsWith('sunday_worked') && 'bg-indigo-500/[0.01]'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">

                    {/* Date Block */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted/30 border border-border/80 flex flex-col items-center justify-center text-foreground font-mono flex-shrink-0">
                        <span className="text-[10px] font-bold uppercase text-primary/80 leading-none">
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-sm font-extrabold leading-none mt-1">
                          {new Date(item.date).getDate()}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-snug">
                          {new Date(item.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{item.dayName}</p>
                      </div>
                    </div>

                    {/* Clock Times Grid */}
                    {hasTimings ? (
                      <div className="flex items-center gap-6 text-xs font-mono">
                        <div>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase block mb-0.5">Check In</span>
                          <span className="text-foreground font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            {formatTime(item.checkInTime)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase block mb-0.5">Check Out</span>
                          <span className="text-foreground font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary" />
                            {formatTime(item.checkOutTime)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase block mb-0.5">Duration</span>
                          <span className="text-foreground font-semibold">
                            {getElapsedTime(item.checkInTime, item.checkOutTime)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        No shift logged
                      </div>
                    )}

                    {/* Status badge & Expand dropdown */}
                    <div className="flex items-center gap-3">
                      {getStatusBadge(item.status)}

                      {hasSummary && (
                        <button
                          onClick={() => toggleExpand(item.date)}
                          className="w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Expandable details container */}
                  {isExpanded && hasSummary && (
                    <div className="mt-1 p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3 animate-in slide-in-from-top-2 duration-200">

                      {item.summary && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            Work Accomplished
                          </span>
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap pl-4.5">
                            {item.summary}
                          </p>
                        </div>
                      )}

                      {item.sundayNotes && (
                        <div className="space-y-1 pt-1.5 border-t border-border/40">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                            <Info className="w-3.5 h-3.5" />
                            Sunday Reimbursement Claim Notes
                          </span>
                          <p className="text-xs text-foreground leading-relaxed pl-4.5">
                            {item.sundayNotes}
                          </p>
                        </div>
                      )}

                      {item.sundayRemarks && (
                        <div className="space-y-1 pt-1.5 border-t border-border/40 p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
                            Admin Review Feedback
                          </span>
                          <p className="text-xs text-foreground leading-relaxed font-semibold italic pl-4.5">
                            "{item.sundayRemarks}"
                          </p>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>

    </div>
  );
}
