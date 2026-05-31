// ============================================================
// HR Portal — TypeScript Types
// ============================================================

export type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave';

export type Department =
  | 'Engineering'
  | 'Design'
  | 'Marketing'
  | 'Sales'
  | 'HR'
  | 'Finance'
  | 'Operations'
  | 'Product';

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  department: Department;
  salary: number;
  joiningDate: string;
  status: EmployeeStatus;
  avatar?: string;
  phone?: string;
  upiId?: string;
}

export type LetterStatus = 'Generated' | 'Sent' | 'Pending' | 'Draft';

export interface OfferLetter {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  templateName: string;
  templateId?: string;
  roleTitle?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  salary?: string;
  generatedAt: string;
  sentAt?: string;
  status: LetterStatus;
  pdfFilename?: string;
  pptxFilename?: string;
  downloadUrl?: string;
}

export interface OfferTemplate {
  id: string;
  name: string;
  roleTitle: string;
  responsibilities: string;
  salary: string;
  duration: string;
  emailSubject: string;
  emailBody: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceLetter {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  role?: string;
  joiningDate: string;
  relievingDate: string;
  duration: string;
  generatedAt: string;
  status: LetterStatus;
  pdfFilename?: string;
  pptxFilename?: string;
  downloadUrl?: string;
}

export interface LOR {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  role?: string;
  recipientName?: string;
  recipientOrg?: string;
  recommendation?: string;
  generatedAt: string;
  status: LetterStatus;
  pdfFilename?: string;
  pptxFilename?: string;
}

export interface SalaryDataPoint {
  month: string;
  expenditure: number;
  headcount: number;
}

export interface DepartmentSalary {
  department: Department;
  totalSalary: number;
  headcount: number;
  avgSalary: number;
}

export interface HiringTrend {
  month: string;
  hired: number;
  left: number;
}

export interface ActivityItem {
  id: string;
  type: 'employee_added' | 'offer_sent' | 'email_sent' | 'letter_generated';
  title: string;
  subtitle: string;
  timestamp: string;
  avatar?: string;
}

export interface StatsCardData {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface CompanySettings {
  name: string;
  email: string;
  address: string;
  phone: string;
  website: string;
  logoUrl?: string;
  hrSignatureUrl?: string;
  gmailConnected: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
}

export interface Template {
  id: string;
  name: string;
  type: 'offer' | 'experience' | 'lor';
  description: string;
  preview?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateEmployeePayload {
  employeeId: string;
  name: string;
  email: string;
  role: string;
  department: Department;
  salary: number;
  joiningDate: string;
  status: EmployeeStatus;
  generateOfferLetter?: boolean;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // ISO string
  checkOutTime?: string; // ISO string
  summary?: string;
  status: 'present' | 'absent';
  
  // Sunday Reimbursement Fields
  isSunday?: boolean;
  sundayReimbursementStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  sundayNotes?: string;
  sundayRemarks?: string;
}

export interface PaymentRecord {
  id: string; // employeeId_YYYY-MM
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  salaryAmount: number;
  presentDays: number;
  absentDays: number;
  sundayWorkedCount: number;
  totalPayableDays: number;
  upiId: string;
  paymentStatus: 'Pending' | 'Paid' | 'Processing';
  remarks?: string;
  transactionRef?: string;
  updatedAt: string;
}
