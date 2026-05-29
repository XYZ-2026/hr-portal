'use client';

import { useState, useEffect } from 'react';
import { X, User, Mail, Briefcase, Building2, DollarSign, Calendar } from 'lucide-react';
import { Employee, CreateEmployeePayload, Department, EmployeeStatus, OfferTemplate } from '@/types';
import { cn } from '@/lib/utils';
import { templateApi } from '@/services/api';

const DEPARTMENTS: Department[] = [
  'Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Product',
];

const ROLES = [
  'Software Engineer', 'Senior Software Engineer', 'Lead Engineer', 'DevOps Engineer',
  'Product Designer', 'UI/UX Designer', 'Product Manager', 'Marketing Manager',
  'Sales Executive', 'Sales Manager', 'HR Manager', 'Financial Analyst', 'Data Analyst',
  'Operations Lead', 'Full Stack Developer', 'Backend Developer', 'Frontend Developer',
];

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmployeePayload & {
    templateId?: string;
    startDate?: string;
    endDate?: string;
    offerSalary?: string;
  }) => Promise<void>;
  editData?: Employee | null;
}

const defaultForm: CreateEmployeePayload = {
  employeeId: '',
  name: '',
  email: '',
  role: '',
  department: 'Engineering',
  salary: 0,
  joiningDate: new Date().toISOString().split('T')[0],
  status: 'Active',
  generateOfferLetter: false,
};

export function AddEmployeeModal({ open, onClose, onSubmit, editData }: AddEmployeeModalProps) {
  const [form, setForm] = useState<CreateEmployeePayload>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState('');

  // Offer Letter Generation States
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerEndDate, setOfferEndDate] = useState('');
  const [offerSalary, setOfferSalary] = useState('');

  // Fetch templates when modal opens
  useEffect(() => {
    if (open) {
      const fetchTemplates = async () => {
        try {
          const res = await templateApi.getAll();
          setTemplates(res.data || []);
          const defaultTpl = res.data?.find((t) => t.isDefault) || res.data?.[0];
          if (defaultTpl) {
            setSelectedTemplate(defaultTpl.id);
            setOfferSalary(defaultTpl.salary);
          }
        } catch (err) {
          console.error('Failed to load templates in modal:', err);
        }
      };
      fetchTemplates();
      
      // Auto-set default offer start date to joiningDate
      setOfferStartDate(form.joiningDate || new Date().toISOString().split('T')[0]);
      // Auto-set default offer end date to 3 months later
      const d = new Date(form.joiningDate || new Date());
      d.setMonth(d.getMonth() + 3);
      setOfferEndDate(d.toISOString().split('T')[0]);
    }
  }, [open, form.joiningDate]);

  // Sync salary when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const tpl = templates.find((t) => t.id === selectedTemplate);
      if (tpl) {
        setOfferSalary(tpl.salary);
      }
    }
  }, [selectedTemplate, templates]);

  useEffect(() => {
    if (editData) {
      setForm({
        employeeId: editData.employeeId || '',
        name: editData.name,
        email: editData.email,
        role: editData.role,
        department: editData.department,
        salary: editData.salary,
        joiningDate: editData.joiningDate,
        status: editData.status,
        generateOfferLetter: false,
      });
      const isPredefined = ROLES.includes(editData.role);
      if (editData.role && !isPredefined) {
        setIsCustomRole(true);
        setCustomRoleInput(editData.role);
      } else {
        setIsCustomRole(false);
        setCustomRoleInput('');
      }
    } else {
      setForm({
        ...defaultForm,
        employeeId: 'CS-' + Math.floor(1000 + Math.random() * 9000),
      });
      setIsCustomRole(false);
      setCustomRoleInput('');
    }
    setErrors({});
  }, [editData, open]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.employeeId.trim()) errs.employeeId = 'Employee ID is required';
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
    if (!form.role.trim()) errs.role = 'Role is required';
    if (!form.salary || form.salary <= 0) errs.salary = 'Salary must be greater than 0';
    if (!form.joiningDate) errs.joiningDate = 'Joining date is required';

    if (form.generateOfferLetter) {
      if (!selectedTemplate) errs.templateId = 'Offer template is required';
      if (!offerStartDate) errs.offerStartDate = 'Start date is required';
      if (!offerEndDate) errs.offerEndDate = 'End date is required';
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      if (form.generateOfferLetter) {
        await onSubmit({
          ...form,
          templateId: selectedTemplate,
          startDate: offerStartDate,
          endDate: offerEndDate,
          offerSalary: offerSalary,
        });
      } else {
        await onSubmit(form);
      }
    } finally {
      setLoading(false);
    }
  };

  const setField = <K extends keyof CreateEmployeePayload>(key: K, value: CreateEmployeePayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 modal-backdrop" onClick={onClose} />

      <div 
        className="relative z-10 w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: 'hsl(var(--card))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {editData ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editData ? 'Update employee information' : 'Fill in the details to onboard a new team member'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Employee ID */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Employee ID
            </label>
            <div className={cn('flex items-center gap-2 h-10 px-3 rounded-xl border bg-muted/30 transition-colors', errors.employeeId ? 'border-red-400/50' : 'border-border focus-within:border-primary/50')}>
              <span className="text-xs font-bold text-muted-foreground select-none flex-shrink-0">ID</span>
              <input
                value={form.employeeId}
                onChange={(e) => setField('employeeId', e.target.value)}
                placeholder="e.g. CS-024"
                className="bg-transparent outline-none flex-1 text-sm text-foreground placeholder:text-muted-foreground"
                id="emp-id"
                disabled={!!editData}
              />
            </div>
            {errors.employeeId && <p className="text-xs text-red-400 mt-1">{errors.employeeId}</p>}
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Full Name
            </label>
            <div className={cn('flex items-center gap-2 h-10 px-3 rounded-xl border bg-muted/30 transition-colors', errors.name ? 'border-red-400/50' : 'border-border focus-within:border-primary/50')}>
              <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Priya Sharma"
                className="bg-transparent outline-none flex-1 text-sm text-foreground placeholder:text-muted-foreground"
                id="emp-name"
              />
            </div>
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Email Address
            </label>
            <div className={cn('flex items-center gap-2 h-10 px-3 rounded-xl border bg-muted/30', errors.email ? 'border-red-400/50' : 'border-border focus-within:border-primary/50')}>
              <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="priya@company.com"
                className="bg-transparent outline-none flex-1 text-sm text-foreground placeholder:text-muted-foreground"
                id="emp-email"
              />
            </div>
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>

          {/* Role + Department row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Role
              </label>
              <div className={cn('flex items-center gap-2 h-10 px-3 rounded-xl border bg-card', errors.role ? 'border-red-400/50' : 'border-border focus-within:border-primary/50')}>
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <select
                  value={isCustomRole ? 'custom' : form.role}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setIsCustomRole(true);
                      setField('role', customRoleInput);
                    } else {
                      setIsCustomRole(false);
                      setField('role', val);
                    }
                  }}
                  className="bg-card outline-none flex-1 text-sm text-foreground cursor-pointer [color-scheme:dark] dark:[color-scheme:dark]"
                  id="emp-role"
                >
                  <option value="" style={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>Select role</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r} style={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>
                      {r}
                    </option>
                  ))}
                  <option value="custom" style={{ background: 'hsl(var(--card))', color: 'hsl(var(--primary))', fontWeight: 'bold' }}>
                    + Add Custom Role...
                  </option>
                </select>
              </div>
              {errors.role && <p className="text-xs text-red-400 mt-1">{errors.role}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Department
              </label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-card focus-within:border-primary/50">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <select
                  value={form.department}
                  onChange={(e) => setField('department', e.target.value as Department)}
                  className="bg-card outline-none flex-1 text-sm text-foreground cursor-pointer [color-scheme:dark] dark:[color-scheme:dark]"
                  id="emp-department"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d} style={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Custom Role Input field (conditionally rendered) */}
          {isCustomRole && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5 block">
                Custom Role Name
              </label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-primary/30 bg-primary/5 focus-within:border-primary focus-within:bg-card transition-all">
                <Briefcase className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <input
                  type="text"
                  value={customRoleInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomRoleInput(val);
                    setField('role', val);
                  }}
                  placeholder="e.g. Lead Researcher, Principal Architect"
                  className="bg-transparent outline-none flex-1 text-sm text-foreground placeholder:text-muted-foreground/60 animate-none"
                  id="emp-custom-role"
                />
              </div>
            </div>
          )}

          {/* Salary + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Monthly Salary (₹)
              </label>
              <div className={cn('flex items-center gap-2 h-10 px-3 rounded-xl border bg-muted/30', errors.salary ? 'border-red-400/50' : 'border-border focus-within:border-primary/50')}>
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  type="number"
                  value={form.salary || ''}
                  onChange={(e) => setField('salary', Number(e.target.value))}
                  placeholder="150000"
                  className="bg-transparent outline-none flex-1 text-sm text-foreground placeholder:text-muted-foreground"
                  id="emp-salary"
                />
              </div>
              {errors.salary && <p className="text-xs text-red-400 mt-1">{errors.salary}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Joining Date
              </label>
              <div className={cn('flex items-center gap-2 h-10 px-3 rounded-xl border bg-muted/30', errors.joiningDate ? 'border-red-400/50' : 'border-border focus-within:border-primary/50')}>
                <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => setField('joiningDate', e.target.value)}
                  className="bg-transparent outline-none flex-1 text-sm text-foreground"
                  id="emp-joining-date"
                />
              </div>
              {errors.joiningDate && <p className="text-xs text-red-400 mt-1">{errors.joiningDate}</p>}
            </div>
          </div>

          {/* Generate & Send Offer Letter toggle */}
          {!editData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5">
                <div>
                  <p className="text-sm font-semibold text-primary">Generate & Send Offer Letter</p>
                  <p className="text-xs text-muted-foreground">Auto-generate PDF and send to employee via Gmail</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField('generateOfferLetter', !form.generateOfferLetter)}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-all flex items-center border',
                    form.generateOfferLetter ? 'border-transparent' : 'border-border'
                  )}
                  style={{
                    backgroundColor: form.generateOfferLetter 
                      ? 'hsl(var(--primary))' 
                      : 'hsl(var(--muted-foreground) / 0.35)'
                  }}
                  id="offer-letter-toggle"
                >
                  <span
                    className={cn(
                      'absolute left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform',
                      form.generateOfferLetter ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {/* Generate and Send Offer Letter options block */}
              {form.generateOfferLetter && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">
                    Offer Letter Configuration
                  </p>
                  
                  {/* Select Offer Template */}
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                      Offer Template
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground outline-none cursor-pointer [color-scheme:dark] dark:[color-scheme:dark]"
                      id="modal-offer-template"
                    >
                      <option value="">Select template...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id} style={{ background: 'hsl(var(--card))' }}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {errors.templateId && <p className="text-[10px] text-red-400 mt-0.5">{errors.templateId}</p>}
                  </div>

                  {/* Start & End Dates */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={offerStartDate}
                        onChange={(e) => setOfferStartDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground outline-none focus:border-primary/50"
                      />
                      {errors.offerStartDate && <p className="text-[10px] text-red-400 mt-0.5">{errors.offerStartDate}</p>}
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={offerEndDate}
                        onChange={(e) => setOfferEndDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground outline-none focus:border-primary/50"
                      />
                      {errors.offerEndDate && <p className="text-[10px] text-red-400 mt-0.5">{errors.offerEndDate}</p>}
                    </div>
                  </div>

                  {/* Offer Salary */}
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                      Salary / Stipend (Override)
                    </label>
                    <input
                      type="text"
                      value={offerSalary}
                      onChange={(e) => setOfferSalary(e.target.value)}
                      placeholder="e.g. 15,000 Per Month"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Status
            </label>
            <div className="flex gap-2">
              {(['Active', 'Inactive', 'On Leave'] as EmployeeStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setField('status', s)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-semibold border transition-all',
                    form.status === s
                      ? s === 'Active'
                        ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                        : s === 'Inactive'
                          ? 'bg-red-400/10 border-red-400/30 text-red-400'
                          : 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                      : 'border-border text-muted-foreground hover:bg-muted/60'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed"
            id="submit-employee-btn"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {editData ? 'Saving...' : 'Adding...'}
              </>
            ) : (
              editData ? 'Save Changes' : 'Add Employee'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
