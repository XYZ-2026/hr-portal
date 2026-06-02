'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  CreditCard,
  Search,
  Check,
  X,
  FileText,
  Download,
  Building,
  UserCheck,
  AlertCircle,
  Eye
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { useToastContext } from '@/components/providers/ToastProvider';
import { Department } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

interface OnboardingRegistration {
  id: string;
  fullName: string;
  personalEmail: string;
  phoneNumber: string;
  emailAddress: string;
  collegeFullName: string;
  branch: string;
  year: string;
  createdNewEmail: string;
  aadharFileName: string;
  aadharCard: string; // base64
  panFileName: string | null;
  panCard: string | null; // base64
  paymentMethod: 'upi' | 'bank';
  upiDetails: { upiId: string; upiPhoneNo: string } | null;
  bankDetails: { accountHolderName: string; accountNo: string; ifscCode: string } | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt: string;
}

const DEPARTMENTS: Department[] = [
  'Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Product',
];

export default function EmployeeDetailsPage() {
  const toast = useToastContext();
  const [registrations, setRegistrations] = useState<OnboardingRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState<OnboardingRegistration | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');

  // Modal Approve Onboarding State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [adminRole, setAdminRole] = useState('');
  const [adminDept, setAdminDept] = useState<Department>('Engineering');
  const [adminSalary, setAdminSalary] = useState('15000');
  const [submittingApprove, setSubmittingApprove] = useState(false);

  // Fetch registrations
  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'onboard_registrations'));
      const list: OnboardingRegistration[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as OnboardingRegistration);
      });
      // Sort by submittedAt descending
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setRegistrations(list);

      // Auto-select first item if available
      if (list.length > 0) {
        // If there's already a selected registration, keep it, else set first
        setSelectedReg(prev => {
          if (prev) {
            const found = list.find(r => r.id === prev.id);
            return found || list[0];
          }
          return list[0];
        });
      } else {
        setSelectedReg(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch', 'Could not load onboarding registration details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  // Filter registrations
  const filtered = registrations.filter((reg) => {
    const matchSearch =
      reg.fullName.toLowerCase().includes(search.toLowerCase()) ||
      reg.personalEmail.toLowerCase().includes(search.toLowerCase()) ||
      reg.createdNewEmail.toLowerCase().includes(search.toLowerCase()) ||
      reg.collegeFullName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || reg.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Helper to open Base64 document in new tab or download
  const downloadDocument = (base64Data: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to check if file is an image
  const isImageBase64 = (base64Str: string) => {
    return base64Str.startsWith('data:image/');
  };

  // Handle Reject action
  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this registration?')) return;
    try {
      await updateDoc(doc(db, 'onboard_registrations', id), {
        status: 'Rejected'
      });
      toast.success('Registration Rejected', 'The onboarding form has been rejected.');
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      toast.error('Operation Failed', 'Could not reject registration.');
    }
  };

  // Open Approval Dialog prefilled
  const openApproveDialog = (reg: OnboardingRegistration) => {
    setAdminRole(reg.branch || '');
    setApproveModalOpen(true);
  };

  // Handle Approve & Onboard action
  const handleApproveOnboard = async () => {
    if (!selectedReg) return;
    if (!adminRole) {
      alert('Please fill in the Job Title/Role.');
      return;
    }

    setSubmittingApprove(true);
    try {
      const empId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
      const empCollection = collection(db, 'employees');
      const docRef = doc(empCollection); // create new random ID for temporary placement

      // 1. Create entry in employees collection
      await setDoc(docRef, {
        id: docRef.id,
        employeeId: empId,
        name: selectedReg.fullName,
        email: selectedReg.createdNewEmail.toLowerCase(),
        role: adminRole,
        department: adminDept,
        salary: Number(adminSalary) || 0,
        joiningDate: new Date().toISOString().split('T')[0], // current YYYY-MM-DD
        status: 'Active',
        phone: selectedReg.phoneNumber,
        personalEmail: selectedReg.personalEmail,
        bankDetails: selectedReg.bankDetails,
        upiDetails: selectedReg.upiDetails,
        paymentMethod: selectedReg.paymentMethod,
      });

      // 2. Update status in onboard_registrations collection
      await updateDoc(doc(db, 'onboard_registrations', selectedReg.id), {
        status: 'Approved'
      });

      toast.success('Employee Onboarded!', `${selectedReg.fullName} has been successfully added to active employees list.`);
      setApproveModalOpen(false);
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      toast.error('Operation Failed', 'Could not approve employee onboarding.');
    } finally {
      setSubmittingApprove(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      <PageHeader
        title="Employee Details"
        subtitle="Review onboarding registration submissions & verify documentation"
      />

      {/* Filter panel */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm flex-1 min-w-[200px] max-w-sm shadow-sm focus-within:border-indigo-500/50">
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search registrations by name, college..."
            className="bg-transparent outline-none flex-1 text-slate-800 placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-sm">
          {['Pending', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                statusFilter === status
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {status} Submissions
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs text-slate-400 font-semibold">
          {filtered.length} submission{filtered.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={User}
          title={`No ${statusFilter.toLowerCase()} submissions`}
          description="There are currently no onboarding registrations matching this status."
        />
      ) : (
        /* Split view */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left panel: Registrations list */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-[680px] flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">Registrations List</h3>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
              {filtered.map((reg) => (
                <button
                  key={reg.id}
                  onClick={() => setSelectedReg(reg)}
                  className={cn(
                    "w-full p-4 text-left flex items-start gap-3 transition-all hover:bg-slate-50",
                    selectedReg?.id === reg.id ? "bg-indigo-50/40 border-l-4 border-indigo-600" : "border-l-4 border-transparent"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {reg.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{reg.fullName}</p>
                    <p className="text-xs text-slate-500 font-medium truncate font-mono">{reg.createdNewEmail}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(reg.submittedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>

                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        reg.status === 'Pending' ? "bg-amber-50 text-amber-600 border border-amber-200" :
                          reg.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                            "bg-rose-50 text-rose-600 border border-rose-200"
                      )}>
                        {reg.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel: Details submission viewer */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-[680px] flex flex-col">
            {selectedReg ? (
              <>
                {/* Panel Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-wrap gap-3 flex-shrink-0">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Registration Details</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Submitted ID: {selectedReg.id}</p>
                  </div>

                  {selectedReg.status === 'Pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReject(selectedReg.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => openApproveDialog(selectedReg)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer shadow-sm shadow-indigo-600/10"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Approve & Onboard
                      </button>
                    </div>
                  )}
                </div>

                {/* Content Viewer Body */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">

                  {/* Grid: Personal + College Profile */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Personal Profile Info
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Full Name</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedReg.fullName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Phone Number</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedReg.phoneNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Personal Email ID</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedReg.personalEmail}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email address</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedReg.emailAddress}</p>
                      </div>
                    </div>
                  </div>

                  {/* Academic Profile */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" /> College & Work Settings
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">College Full Name</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedReg.collegeFullName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Branch</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedReg.branch}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Year</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedReg.year}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Created New Email ID</p>
                        <p className="text-sm font-bold text-indigo-700 font-mono mt-0.5 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 self-start inline-block">
                          {selectedReg.createdNewEmail}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bank & Payment Info */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Payment & Settlement Details
                    </h4>

                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      {selectedReg.paymentMethod === 'upi' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider mb-2">
                              Settlement Mode: UPI
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">UPI ID</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedReg.upiDetails?.upiId || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">UPI Phone No</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedReg.upiDetails?.upiPhoneNo || 'N/A'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-3">
                            <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider mb-2">
                              Settlement Mode: Bank Account
                            </span>
                          </div>
                          <div className="md:col-span-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Account Holder Name</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedReg.bankDetails?.accountHolderName || 'N/A'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Account Number</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono">{selectedReg.bankDetails?.accountNo || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">IFSC Code</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono uppercase">{selectedReg.bankDetails?.ifscCode || 'N/A'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Identity Documentation Documents
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                      {/* Aadhar Card display */}
                      <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">Aadhar Card</span>
                          <button
                            onClick={() => downloadDocument(selectedReg.aadharCard, selectedReg.aadharFileName)}
                            className="p-1 rounded bg-white hover:bg-slate-100 text-slate-500 border border-slate-200"
                            title="Download Aadhar Card"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex-1 min-h-[160px] bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-1">
                          {isImageBase64(selectedReg.aadharCard) ? (
                            <img
                              src={selectedReg.aadharCard}
                              alt="Aadhar Card"
                              className="max-h-40 object-contain w-full"
                            />
                          ) : (
                            <div className="text-center p-3 space-y-1">
                              <FileText className="w-8 h-8 text-indigo-500 mx-auto" />
                              <p className="text-[10px] font-bold text-slate-500 truncate max-w-[140px]">{selectedReg.aadharFileName}</p>
                              <p className="text-[9px] text-slate-400 font-semibold">PDF Document</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* PAN Card display */}
                      <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">PAN Card</span>
                          {selectedReg.panCard && (
                            <button
                              onClick={() => downloadDocument(selectedReg.panCard!, selectedReg.panFileName || 'pan_card.jpg')}
                              className="p-1 rounded bg-white hover:bg-slate-100 text-slate-500 border border-slate-200"
                              title="Download PAN Card"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex-1 min-h-[160px] bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-1">
                          {selectedReg.panCard ? (
                            isImageBase64(selectedReg.panCard) ? (
                              <img
                                src={selectedReg.panCard}
                                alt="PAN Card"
                                className="max-h-40 object-contain w-full"
                              />
                            ) : (
                              <div className="text-center p-3 space-y-1">
                                <FileText className="w-8 h-8 text-indigo-500 mx-auto" />
                                <p className="text-[10px] font-bold text-slate-500 truncate max-w-[140px]">{selectedReg.panFileName}</p>
                                <p className="text-[9px] text-slate-400 font-semibold">PDF Document</p>
                              </div>
                            )
                          ) : (
                            <p className="text-xs text-slate-400 font-medium italic">No PAN Card uploaded</p>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </>
            ) : (
              <EmptyState
                icon={Eye}
                title="Select a submission"
                description="Choose an onboarding registration from the left panel list to view full details."
              />
            )}
          </div>

        </div>
      )}

      {/* Approval & Onboarding Modal */}
      {approveModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setApproveModalOpen(false)} />

          <div className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Approve & Onboard</h3>
                <p className="text-xs text-slate-400 font-semibold">Assign role and settings for {selectedReg.fullName}</p>
              </div>
            </div>

            <div className="space-y-4">

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Official Job Title / Role
                </label>
                <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus-within:border-indigo-500/50 focus-within:bg-white focus-within:shadow-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={adminRole}
                    onChange={(e) => setAdminRole(e.target.value)}
                    placeholder="e.g. Full Stack Engineer"
                    className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Department
                </label>
                <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus-within:border-indigo-500/50 focus-within:bg-white focus-within:shadow-sm">
                  <Building className="w-4 h-4 text-slate-400" />
                  <select
                    value={adminDept}
                    onChange={(e) => setAdminDept(e.target.value as Department)}
                    className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 cursor-pointer appearance-none w-full"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Monthly Stipend / Salary (₹)
                </label>
                <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus-within:border-indigo-500/50 focus-within:bg-white focus-within:shadow-sm">
                  <span className="text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={adminSalary}
                    onChange={(e) => setAdminSalary(e.target.value)}
                    placeholder="15000"
                    className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="px-4 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingApprove}
                onClick={handleApproveOnboard}
                className="px-5 h-10 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
              >
                {submittingApprove ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Onboarding...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve & Onboard
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
