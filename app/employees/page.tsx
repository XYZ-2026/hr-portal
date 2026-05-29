'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Metadata } from 'next';
import {
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  MoreHorizontal,
  UserPlus,
  Download,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { AddEmployeeModal } from '@/components/employees/AddEmployeeModal';
import { useEmployees } from '@/hooks/useEmployees';
import { useToastContext } from '@/components/providers/ToastProvider';
import { Employee, Department, EmployeeStatus, CreateEmployeePayload } from '@/types';
import { formatCurrency, formatDate, getInitials, cn } from '@/lib/utils';
import { offerLetterApi } from '@/services/api';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

const DEPARTMENTS: Department[] = [
  'Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Product',
];
const STATUSES: EmployeeStatus[] = ['Active', 'Inactive', 'On Leave'];
const PAGE_SIZE = 8;

export default function EmployeesPage() {
  const { employees, isLoading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const toast = useToastContext();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('search');
      if (q) setSearch(q);
      
      const add = params.get('add');
      if (add === 'true') {
        setModalOpen(true);
        // Clear params so refreshing doesn't reopen modal
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        !search ||
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        emp.role.toLowerCase().includes(search.toLowerCase());
      const matchDept = !deptFilter || emp.department === deptFilter;
      const matchStatus = !statusFilter || emp.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, deptFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteEmployee(id);
      toast.success('Employee removed', 'The employee has been deleted successfully.');
    } catch {
      toast.error('Failed to delete', 'Something went wrong. Please try again.');
    } finally {
      setDeletingId(null);
      setOpenMenuId(null);
    }
  };

  const handleAddOrEdit = async (
    data: CreateEmployeePayload & {
      templateId?: string;
      startDate?: string;
      endDate?: string;
      offerSalary?: string;
    }
  ) => {
    if (editEmployee) {
      const { generateOfferLetter, templateId, startDate, endDate, offerSalary, ...empPayload } = data;
      await updateEmployee(editEmployee.id, empPayload);
      toast.success('Employee updated', 'Changes saved successfully.');
    } else {
      const { generateOfferLetter, templateId, startDate, endDate, offerSalary, ...empPayload } = data;
      const newEmp = await addEmployee(empPayload);
      toast.success('Employee onboarded!', 'The new employee has been added to the team.');

      if (generateOfferLetter && templateId && startDate && endDate) {
        // Run generation and email sending in the background asynchronously
        (async () => {
          toast.info('Generating Offer Letter...', `Creating PDF for ${newEmp.name}...`);
          try {
            // Format dates for letter template (DD-MMM-YY, e.g. 29-May-26)
            const offerDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
            const startDateStr = new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
            const endDateStr = new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');

            // Generate Offer Letter
            const genRes = await offerLetterApi.generate({
              employeeId: newEmp.employeeId,
              employeeName: newEmp.name,
              employeeEmail: newEmp.email,
              templateId: templateId,
              date: offerDateStr,
              startDate: startDateStr,
              endDate: endDateStr,
              salary: offerSalary || undefined,
            });

            // Store record in Firestore
            await setDoc(doc(db, 'offer_letters', genRes.data.id), genRes.data);

            // Send Offer Letter via Gmail
            toast.info('Sending Email...', `Delivering offer letter to ${newEmp.email}...`);
            const sendRes = await offerLetterApi.send(genRes.data.id, {
              employeeName: genRes.data.employeeName,
              employeeEmail: genRes.data.employeeEmail || '',
              salary: genRes.data.salary || '',
              startDate: genRes.data.startDate || '',
              endDate: genRes.data.endDate || '',
              pdfFilename: genRes.data.pdfFilename || '',
              pptxFilename: genRes.data.pptxFilename || '',
            });

            // Update status in Firestore
            await updateDoc(doc(db, 'offer_letters', genRes.data.id), {
              status: 'Sent',
              sentAt: sendRes.data.sentAt,
            });

            toast.success('Offer Sent Successfully!', `Letter generated & sent to ${newEmp.name} via Gmail.`);
          } catch (err) {
            console.error(err);
            toast.error('Auto-generation failed', err instanceof Error ? err.message : 'Could not generate or send the offer letter.');
          }
        })();
      }
    }
    setModalOpen(false);
    setEditEmployee(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} total · ${employees.filter((e) => e.status === 'Active').length} active`}
        actions={
          <button
            onClick={() => { setEditEmployee(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/30"
            id="add-employee-btn"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-border bg-muted/40 text-sm flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search name, email, role..."
            className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            id="employee-search"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
          className="h-9 px-3 rounded-xl border border-border bg-card text-sm text-foreground outline-none cursor-pointer [color-scheme:dark] dark:[color-scheme:dark]"
          id="dept-filter"
        >
          <option value="" style={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d} style={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="h-9 px-3 rounded-xl border border-border bg-card text-sm text-foreground outline-none cursor-pointer [color-scheme:dark] dark:[color-scheme:dark]"
          id="status-filter"
        >
          <option value="" style={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>All Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} style={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>
              {s}
            </option>
          ))}
        </select>

        {(search || deptFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter(''); setCurrentPage(1); }}
            className="h-9 px-3 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : paginated.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No employees found"
            description={
              search || deptFilter || statusFilter
                ? 'Try adjusting your search or filters.'
                : 'Add your first employee to get started.'
            }
            action={
              !search && !deptFilter && !statusFilter ? (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Add Employee
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {['Employee', 'ID', 'Role', 'Department', 'Salary', 'Joining Date', 'Status', ''].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginated.map((emp) => (
                    <tr
                      key={emp.id}
                      className="group hover:bg-muted/20 table-row-hover transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {getInitials(emp.name)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold bg-muted border border-border px-2.5 py-1 rounded-lg text-muted-foreground font-mono">
                          {emp.employeeId || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-foreground">{emp.role}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-muted-foreground">{emp.department || 'Unassigned'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(emp.salary)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(emp.joiningDate)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={emp.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditEmployee(emp); setModalOpen(true); }}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            disabled={deletingId === emp.id}
                            className="p-1.5 rounded-lg hover:bg-red-400/10 text-muted-foreground hover:text-red-400 transition-all disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'w-7 h-7 rounded-lg text-xs font-semibold transition-all',
                        page === currentPage
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AddEmployeeModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditEmployee(null); }}
        onSubmit={handleAddOrEdit}
        editData={editEmployee}
      />
    </div>
  );
}
