'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  UploadCloud,
  CreditCard,
  Sparkles,
  CheckCircle,
  AlertCircle,
  FileText,
  FileCheck,
  Building,
  Calendar,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RegisterEmployeePage() {
  // Form fields state
  const [fullName, setFullName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [collegeFullName, setCollegeFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [createdNewEmail, setCreatedNewEmail] = useState('');

  // Files state (stored as base64 strings)
  const [aadharCard, setAadharCard] = useState<string | null>(null);
  const [aadharFileName, setAadharFileName] = useState('');
  const [panCard, setPanCard] = useState<string | null>(null);
  const [panFileName, setPanFileName] = useState('');

  // Payment Method state: 'upi' | 'bank'
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'bank'>('upi');

  // UPI Details
  const [upiId, setUpiId] = useState('');
  const [upiPhoneNo, setUpiPhoneNo] = useState('');

  // Bank Details
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Status & UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-generate suggested email based on Full Name
  useEffect(() => {
    if (fullName.trim()) {
      const parts = fullName.toLowerCase().trim().split(/\s+/);
      if (parts.length >= 2) {
        setCreatedNewEmail(`${parts[0]}.${parts[parts.length - 1]}.cs@gmail.com`);
      } else if (parts.length === 1) {
        setCreatedNewEmail(`${parts[0]}.cs@gmail.com`);
      }
    } else {
      setCreatedNewEmail('');
    }
  }, [fullName]);

  // Handle File Input and read as Base64
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFileState: (base64: string | null) => void,
    setFileName: (name: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setFormError('File size is too large. Maximum allowed size is 4MB.');
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileState(reader.result as string);
      };
      reader.onerror = () => {
        setFormError('Error reading file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Form Validations
    if (!fullName || !personalEmail || !phoneNumber || !emailAddress || !collegeFullName || !branch || !year) {
      setFormError('Please fill in all the required personal and academic details.');
      return;
    }

    if (!createdNewEmail.toLowerCase().endsWith('.cs@gmail.com')) {
      setFormError('New Email ID must end with .cs@gmail.com format (e.g. jane.doe.cs@gmail.com).');
      return;
    }

    if (!aadharCard) {
      setFormError('Aadhar Card upload is mandatory.');
      return;
    }

    if (paymentMethod === 'upi') {
      if (!upiId && !upiPhoneNo) {
        setFormError('Please fill in at least one UPI detail (UPI ID or UPI Phone No).');
        return;
      }
    } else {
      if (!accountHolderName || !accountNo || !ifscCode) {
        setFormError('Please fill in all bank account details.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Build document payload
      const payload = {
        fullName,
        personalEmail,
        phoneNumber,
        emailAddress,
        collegeFullName,
        branch,
        year,
        createdNewEmail: createdNewEmail.toLowerCase(),
        aadharFileName,
        aadharCard, // base64 string
        panFileName: panFileName || null,
        panCard: panCard || null, // base64 string
        paymentMethod,
        upiDetails: paymentMethod === 'upi' ? { upiId, upiPhoneNo } : null,
        bankDetails: paymentMethod === 'bank' ? { accountHolderName, accountNo, ifscCode } : null,
        status: 'Pending', // Pending HR approval
        submittedAt: new Date().toISOString()
      };

      // Estimate payload size (limit is 1MB for Firestore document)
      const payloadString = JSON.stringify(payload);
      if (payloadString.length > 1000000) {
        setFormError('Failed to submit onboarding form. The uploaded documents exceed the maximum allowed database size of 1MB. Please compress your files (Aadhar/PAN) and try again.');
        setIsSubmitting(false);
        return;
      }

      // Save to Firebase Firestore
      const onboardingCollection = collection(db, 'onboard_registrations');
      await addDoc(onboardingCollection, payload);

      setSubmitSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error submitting registration: ', err);
      const errStr = String(err?.message || err || '').toLowerCase();
      if (errStr.includes('too large') || 
          errStr.includes('exceeds') || 
          errStr.includes('limit') || 
          errStr.includes('size') ||
          err?.code === 'invalid-argument') {
        setFormError('Failed to submit onboarding form. The document size exceeds the allowed limit. Please try uploading smaller files.');
      } else {
        setFormError('Failed to submit onboarding form. Please check your internet connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-500">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Onboarding Registered!</h2>
            <p className="text-slate-500 font-medium">Thank you, {fullName}. Your registration has been submitted successfully.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 text-left text-sm text-slate-600 space-y-3.5">
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="font-semibold text-slate-500">Personal Email</span>
              <span className="font-medium text-slate-800">{personalEmail}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="font-semibold text-slate-500">Proposed cs Email</span>
              <span className="font-medium text-slate-800 font-mono">{createdNewEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Status</span>
              <span className="inline-flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full text-xs">
                Pending HR Review
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Our Human Resources department will verify your Aadhar Card, PAN Card, and Bank details. You will receive an official activation email once onboarded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative ambient blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[35rem] h-[35rem] bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">

        {/* Header section */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-md border border-slate-200 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Employee Onboarding Form
          </h1>
          <p className="text-slate-500 font-semibold max-w-md mx-auto leading-relaxed">
            Welcome to Concept Simplified! Please fill out the detailed form below to complete your onboarding process.
          </p>
        </div>

        {/* Error Notification */}
        {formError && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 shadow-sm animate-in fade-in duration-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold leading-relaxed">{formError}</p>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden divide-y divide-slate-100 transition-all duration-300">

          {/* Section 1: Personal Profile */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">1</div>
              <h3 className="text-lg font-bold text-slate-800">Personal Profile Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 transition-all focus-within:border-indigo-500/50 focus-within:bg-white focus-within:shadow-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Personal Email ID <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 transition-all focus-within:border-indigo-500/50 focus-within:bg-white focus-within:shadow-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    placeholder="jane.doe@personal.com"
                    className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 transition-all focus-within:border-indigo-500/50 focus-within:bg-white focus-within:shadow-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Work Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 transition-all focus-within:border-indigo-500/50 focus-within:bg-white focus-within:shadow-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="jane.work@example.com"
                    className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: College & Work Identity */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">2</div>
              <h3 className="text-lg font-bold text-slate-800">Academic & Identity Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  College Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 transition-all focus-within:border-indigo-500/50 focus-within:bg-white focus-within:shadow-sm">
                  <Building className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={collegeFullName}
                    onChange={(e) => setCollegeFullName(e.target.value)}
                    placeholder="National Institute of Technology"
                    className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Branch / Stream <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 transition-all focus-within:border-indigo-500/50 focus-within:bg-white focus-within:shadow-sm">
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Computer Science & Engineering"
                    className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Year of Study <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 transition-all focus-within:border-indigo-500/50 focus-within:bg-white focus-within:shadow-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="3rd Year"
                    className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Create New Email ID <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 transition-all focus-within:border-indigo-500/50 focus-within:bg-white focus-within:shadow-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={createdNewEmail}
                    onChange={(e) => setCreatedNewEmail(e.target.value)}
                    placeholder="first_name.last_name.cs@gmail.com"
                    className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-mono font-medium"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-left">
                  Format suggestion: <strong>first_name.last_name.cs@gmail.com</strong>
                </p>
              </div>

            </div>
          </div>

          {/* Section 3: Document Uploads */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">3</div>
              <h3 className="text-lg font-bold text-slate-800">Document Uploads</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Aadhar Card upload */}
              <div className="border border-dashed border-slate-200 rounded-2xl p-5 hover:bg-slate-50/50 transition-colors relative flex flex-col items-center text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  {aadharCard ? <FileCheck className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Upload Aadhar Card <span className="text-rose-500">*</span></h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Images or PDF up to 4MB</p>
                </div>

                {aadharFileName && (
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg truncate max-w-full">
                    {aadharFileName}
                  </span>
                )}

                <label className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer shadow-sm">
                  Select Aadhar
                  <input
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, setAadharCard, setAadharFileName)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* PAN Card upload */}
              <div className="border border-dashed border-slate-200 rounded-2xl p-5 hover:bg-slate-50/50 transition-colors relative flex flex-col items-center text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
                  {panCard ? <FileCheck className="w-5 h-5 text-indigo-600" /> : <UploadCloud className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Upload PAN Card <span className="text-slate-400">(Optional)</span></h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Images or PDF up to 4MB</p>
                </div>

                {panFileName && (
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg truncate max-w-full">
                    {panFileName}
                  </span>
                )}

                <label className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer shadow-sm">
                  Select PAN Card
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, setPanCard, setPanFileName)}
                    className="hidden"
                  />
                </label>
              </div>

            </div>
          </div>

          {/* Section 4: Bank Details */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">4</div>
                <h3 className="text-lg font-bold text-slate-800">Bank Account Details</h3>
              </div>

              {/* Payment Mode Selector */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    paymentMethod === 'upi' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  UPI Payment
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    paymentMethod === 'bank' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Bank Transfer
                </button>
              </div>
            </div>

            {/* UPI Details Block */}
            {paymentMethod === 'upi' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-2xl bg-indigo-50/20 border border-indigo-100/60 animate-in fade-in duration-300">
                <div>
                  <label className="block text-xs font-bold text-indigo-900/60 uppercase tracking-wider mb-2">
                    UPI ID <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-indigo-500/50">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="jane@okaxis"
                      className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-900/60 uppercase tracking-wider mb-2">
                    UPI Phone No <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-indigo-500/50">
                    <Phone className="w-4 h-4 text-indigo-400" />
                    <input
                      type="text"
                      value={upiPhoneNo}
                      onChange={(e) => setUpiPhoneNo(e.target.value)}
                      placeholder="9876543210"
                      className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Bank Transfer Block */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60 animate-in fade-in duration-300">
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Account Holder Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-indigo-500/50">
                    <User className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required={paymentMethod === 'bank'}
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="Jane Doe"
                      className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Account Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-indigo-500/50">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required={paymentMethod === 'bank'}
                      value={accountNo}
                      onChange={(e) => setAccountNo(e.target.value)}
                      placeholder="123456789012"
                      className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-indigo-500/50">
                    <Building className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required={paymentMethod === 'bank'}
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="SBIN0001234"
                      className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-800 placeholder:text-slate-400 font-medium uppercase font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Submit Form Button */}
          <div className="p-6 sm:p-8 bg-slate-50/50 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "h-11 px-8 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all",
                "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting Registration...
                </>
              ) : (
                <>
                  Complete Registration & Submit
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
