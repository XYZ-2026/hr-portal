'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { useToastContext } from '@/components/providers/ToastProvider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { Calendar, Clock, FileText, Download, Loader2, Info } from 'lucide-react';
import { getInitials, cn } from '@/lib/utils';
import { Employee, Attendance } from '@/types';

export default function DailySummariesPage() {
  const toast = useToastContext();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<Attendance[]>([]);

  // Get local date string YYYY-MM-DD
  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const selectedMonthStr = selectedDate.substring(0, 7); // "YYYY-MM"

  useEffect(() => {
    const fetchSummariesData = async () => {
      setLoading(true);
      try {
        // 1. Fetch all onboarded employees
        const empSnapshot = await getDocs(collection(db, 'employees'));
        const empList: Employee[] = [];
        empSnapshot.forEach((doc) => {
          empList.push(doc.data() as Employee);
        });
        setEmployees(empList);

        // 2. Fetch attendance logs for selected month
        const attQuery = query(
          collection(db, 'attendance'),
          where('date', '>=', `${selectedMonthStr}-01`),
          where('date', '<=', `${selectedMonthStr}-31`)
        );
        const attSnapshot = await getDocs(attQuery);
        const attList: Attendance[] = [];
        attSnapshot.forEach((doc) => {
          attList.push(doc.data() as Attendance);
        });
        setAttendanceLogs(attList);
      } catch (err) {
        console.error('Failed to fetch daily summaries:', err);
        toast.error('Error', 'Failed to retrieve summaries for the selected month.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummariesData();
  }, [selectedMonthStr, toast]);

  // Filter attendance logs for the selected date
  const dailyLogs = attendanceLogs.filter((log) => log.date === selectedDate);

  // Merge datasets to find which employees checked in and which didn't for today
  const mergedRecords = employees.map((emp) => {
    const log = dailyLogs.find((l) => l.employeeId === emp.id);
    return {
      employee: emp,
      log: log || null,
    };
  });

  // Sort: show checked-in/out first, then others alphabetically
  mergedRecords.sort((a, b) => {
    if (a.log && !b.log) return -1;
    if (!a.log && b.log) return 1;
    return a.employee.name.localeCompare(b.employee.name);
  });

  // Date selector is fully styled just like experience letters UI, so no extra selectors are required
  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const input = e.currentTarget.querySelector('input');
    if (input) {
      try {
        if (input && 'showPicker' in input) {
          (input as any).showPicker();
        } else {
          (input as any).focus();
        }
      } catch (err) {
        (input as any).focus();
      }
    }
  };

  // Date and Time formatter helpers
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

  const handleExportCSV = () => {
    if (employees.length === 0) return;

    const [yearStr, monthStr] = selectedMonthStr.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    // Get total number of days in the month
    const totalDays = new Date(year, month, 0).getDate();

    const headers = ['Employee Name', 'Email', 'Department', 'Role', 'Date', 'Check In', 'Check Out', 'Duration', 'Status', 'Work Summary'];
    const rows: string[][] = [];

    // Loop through each day of the selected month
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, '0');
      const currentDateStr = `${selectedMonthStr}-${dayStr}`;

      // Filter logs for this specific day
      const currentDayLogs = attendanceLogs.filter((log) => log.date === currentDateStr);

      // For each employee, generate their record for this day
      employees.forEach((emp) => {
        const log = currentDayLogs.find((l) => l.employeeId === emp.id);
        const isCheckedIn = log && !log.checkOutTime;
        const isCheckedOut = log && log.checkOutTime;

        const isCurrentDateSunday = new Date(currentDateStr + 'T00:00:00').getDay() === 0;
        let status = 'Absent';
        if (isCheckedIn) status = 'Checked In';
        else if (isCheckedOut) status = 'Completed';
        else if (isCurrentDateSunday) status = 'Sunday';

        rows.push([
          emp.name,
          emp.email,
          emp.department || 'N/A',
          emp.role || 'N/A',
          currentDateStr,
          log?.checkInTime ? formatTime(log.checkInTime) : '—',
          log?.checkOutTime ? formatTime(log.checkOutTime) : '—',
          log?.checkInTime && log?.checkOutTime ? getElapsedTime(log.checkInTime, log.checkOutTime) : '—',
          status,
          log?.summary ? log.summary.replace(/"/g, '""').replace(/\r?\n/g, ' ') : '—',
        ]);
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map((e) => e.map((x) => `"${x}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Monthly_Attendance_Report_${selectedMonthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Report Exported!', `Monthly daily summaries report for ${selectedMonthStr} has been successfully downloaded.`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Daily Shift Summaries"
        subtitle="Review work progress, shift clock timings, and attendance logs for your employees"
        actions={
          <button
            onClick={handleExportCSV}
            disabled={employees.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow cursor-pointer select-none"
          >
            <Download className="w-4 h-4" />
            Export Monthly CSV
          </button>
        }
      />

      {/* Date Filter & Control Card — Styled exactly like the Experience Letters UI */}
      <div className="glass-card rounded-2xl p-5 mb-6 flex flex-wrap items-center justify-between gap-4 border border-border shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Filter Shift Date</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Select a day to view daily employee summaries</p>
          </div>
        </div>

        {/* Date Selector Wrapper matches Experience Letters UI exactly and triggers showPicker on click */}
        <div
          onClick={handleWrapperClick}
          className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-card focus-within:border-primary/50 min-w-[200px] w-full sm:w-auto cursor-pointer hover:bg-muted/10 transition-colors select-none"
        >
          <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent outline-none flex-1 text-sm text-foreground cursor-pointer"
            id="summaries-filter-date"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : mergedRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="w-10 h-10 text-muted-foreground mb-3" />
            <h4 className="text-sm font-bold text-foreground">No employees found</h4>
            <p className="text-xs text-muted-foreground mt-1">Add employee records to start tracking summaries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Role & Dept</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Check In</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Check Out</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Shift Duration</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider w-80">Work Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {mergedRecords.map(({ employee, log }) => {

                  const isCheckedIn = log && !log.checkOutTime;
                  const isCheckedOut = log && log.checkOutTime;

                  return (
                    <tr
                      key={employee.id}
                      className="group hover:bg-muted/10 transition-colors"
                    >
                      {/* Name / Profile */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {getInitials(employee.name)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-none">{employee.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{employee.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role & Dept */}
                      <td className="px-5 py-4">
                        <p className="text-sm text-foreground">{employee.role}</p>
                        <span className="inline-flex text-[9px] font-semibold bg-muted border border-border px-2 py-0.5 rounded text-muted-foreground mt-1">
                          {employee.department || 'Unassigned'}
                        </span>
                      </td>

                      {/* Check In */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-foreground font-mono">
                          {log?.checkInTime && <Clock className="w-3.5 h-3.5 text-emerald-400" />}
                          {formatTime(log?.checkInTime)}
                        </div>
                      </td>

                      {/* Check Out */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-foreground font-mono">
                          {log?.checkOutTime && <Clock className="w-3.5 h-3.5 text-primary" />}
                          {formatTime(log?.checkOutTime)}
                        </div>
                      </td>

                      {/* Elapsed duration */}
                      <td className="px-5 py-4 text-sm font-mono text-foreground">
                        {getElapsedTime(log?.checkInTime, log?.checkOutTime)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {isCheckedIn && (
                          <span className="inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            Checked In
                          </span>
                        )}
                        {isCheckedOut && (
                          <span className="inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">
                            Completed
                          </span>
                        )}
                        {!log && (
                          <span className={cn(
                            "inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                            new Date(selectedDate + 'T00:00:00').getDay() === 0
                              ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 font-semibold"
                              : "bg-muted border-border text-muted-foreground"
                          )}>
                            {new Date(selectedDate + 'T00:00:00').getDay() === 0 ? 'Sunday' : 'Absent'}
                          </span>
                        )}
                      </td>

                      {/* Summary text */}
                      <td className="px-5 py-4">
                        {log?.summary ? (
                          <div className="p-3 rounded-lg border border-border/80 bg-muted/30 max-h-24 overflow-y-auto text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                            {log.summary}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {isCheckedIn ? 'Summary pending checkout' : 'No summary submitted'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
