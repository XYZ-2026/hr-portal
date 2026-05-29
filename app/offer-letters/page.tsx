'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Download, Mail, CheckCircle, Loader2, Eye, Calendar,
  Briefcase, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectField } from '@/components/shared/SelectField';
import { useToastContext } from '@/components/providers/ToastProvider';
import { OfferLetter, OfferTemplate } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { offerLetterApi, templateApi } from '@/services/api';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

export default function OfferLettersPage() {
  const toast = useToastContext();
  const { employees, isLoading: loadingEmployees } = useEmployees();

  // Letters state
  const [letters, setLetters] = useState<OfferLetter[]>([]);
  const [loadingLetters, setLoadingLetters] = useState(true);

  // Templates state
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Form state
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [offerDate, setOfferDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salary, setSalary] = useState('');
  const [responsibilities, setResponsibilities] = useState('');

  // Action state
  const [generating, setGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Fetch letters from Firestore
  const fetchLetters = useCallback(async () => {
    setLoadingLetters(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'offer_letters'));
      const list: OfferLetter[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data() as OfferLetter);
      });
      list.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
      setLetters(list);
    } catch (err) {
      console.error('Failed to fetch offer letters:', err);
    } finally {
      setLoadingLetters(false);
    }
  }, []);

  // Fetch templates from backend
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await templateApi.getAll();
      setTemplates(res.data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    fetchLetters();
    fetchTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill salary and responsibilities from template
  useEffect(() => {
    if (selectedTemplate) {
      const tpl = templates.find((t) => t.id === selectedTemplate);
      if (tpl) {
        setSalary(tpl.salary);
        setResponsibilities(tpl.responsibilities);
      }
    } else {
      setResponsibilities('');
    }
  }, [selectedTemplate, templates]);

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.name} — ${emp.role}`,
  }));

  const templateOptions = templates.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const selectedTplData = templates.find((t) => t.id === selectedTemplate);

  // Format date for display (DD-MMM-YY)
  const formatDateForLetter = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const handleGenerate = async () => {
    if (!selectedEmp || !selectedTemplate) {
      toast.warning('Select both fields', 'Please choose an employee and a template.');
      return;
    }
    if (!startDate || !endDate) {
      toast.warning('Missing dates', 'Please enter start and end dates.');
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmp);
    if (!emp) return;

    setGenerating(true);
    try {
      const res = await offerLetterApi.generate({
        employeeId: emp.employeeId || selectedEmp,
        employeeName: emp.name,
        employeeEmail: emp.email,
        templateId: selectedTemplate,
        date: formatDateForLetter(offerDate),
        startDate: formatDateForLetter(startDate),
        endDate: formatDateForLetter(endDate),
        salary: salary || undefined,
        responsibilities: responsibilities || undefined,
      });

      // Store record in Firestore
      await setDoc(doc(db, 'offer_letters', res.data.id), res.data);

      setLetters((prev) => [res.data, ...prev]);
      toast.success('Offer letter generated!', `PDF created for ${emp.name}`);
      setSelectedEmp('');
      setSelectedTemplate('');
      setStartDate('');
      setEndDate('');
      setSalary('');
      setResponsibilities('');
    } catch (err) {
      console.error(err);
      toast.error('Generation failed', err instanceof Error ? err.message : 'Could not generate the offer letter. Is the backend running?');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (id: string) => {
    const letter = letters.find((l) => l.id === id);
    if (!letter) return;

    setSendingId(id);
    try {
      const tpl = templates.find((t) => t.id === letter.templateId);

      const res = await offerLetterApi.send(id, {
        employeeName: letter.employeeName,
        employeeEmail: letter.employeeEmail || '',
        salary: letter.salary || '',
        startDate: letter.startDate || '',
        endDate: letter.endDate || '',
        pdfFilename: letter.pdfFilename || '',
        pptxFilename: letter.pptxFilename || '',
        emailSubject: tpl?.emailSubject,
        emailBody: tpl?.emailBody,
      });

      // Update Firestore document
      const docRef = doc(db, 'offer_letters', id);
      await updateDoc(docRef, { status: 'Sent', sentAt: res.data.sentAt });

      setLetters((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, status: 'Sent' as const, sentAt: res.data.sentAt } : l
        )
      );
      toast.success('Email sent!', 'Offer letter has been sent to the employee via Gmail.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send', err instanceof Error ? err.message : 'Could not send the email.');
    } finally {
      setSendingId(null);
    }
  };

  const handleDownload = (letter: OfferLetter) => {
    const url = offerLetterApi.download(letter.id, letter.pdfFilename || '');
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Offer Letters"
        subtitle="Generate and send offer letters to new hires"
        actions={
          <Link
            href="/offer-templates"
            className="flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <Briefcase className="w-3.5 h-3.5" />
            Manage Templates
            <ExternalLink className="w-3 h-3" />
          </Link>
        }
      />

      {/* Generator Panel */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Generate New Offer Letter</h3>

        {/* Row 1: Employee + Template */}
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Select Employee
            </label>
            <SelectField
              id="offer-employee-select"
              value={selectedEmp}
              onChange={setSelectedEmp}
              placeholder={loadingEmployees ? 'Loading employees...' : 'Choose employee...'}
              options={employeeOptions}
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Select Template
            </label>
            <SelectField
              id="offer-template-select"
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              placeholder={loadingTemplates ? 'Loading templates...' : 'Choose template...'}
              options={templateOptions}
            />
          </div>
        </div>

        {/* Row 2: Dates + Salary */}
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="min-w-[150px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Offer Date
            </label>
            <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-card focus-within:border-primary/50">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={offerDate}
                onChange={(e) => setOfferDate(e.target.value)}
                className="bg-transparent outline-none flex-1 text-sm text-foreground"
                id="offer-date"
              />
            </div>
          </div>

          <div className="min-w-[150px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Start Date
            </label>
            <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-card focus-within:border-primary/50">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent outline-none flex-1 text-sm text-foreground"
                id="offer-start-date"
              />
            </div>
          </div>

          <div className="min-w-[150px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              End Date
            </label>
            <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-card focus-within:border-primary/50">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent outline-none flex-1 text-sm text-foreground"
                id="offer-end-date"
              />
            </div>
          </div>

          <div className="min-w-[160px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Salary / Stipend
            </label>
            <input
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="e.g. 15,000 Per Month"
              className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              id="offer-salary"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || loadingEmployees || loadingTemplates}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed flex-shrink-0"
            id="generate-offer-btn"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>

        {/* Dynamic Roles & Responsibilities Variable Editor */}
        {selectedTemplate && (
          <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                <label className="text-xs font-bold text-primary uppercase tracking-wider">
                  Edit Roles & Responsibilities (Variable)
                </label>
              </div>
              <span className="text-[10px] text-muted-foreground italic">
                Changes here are dynamic and won't affect the saved template database.
              </span>
            </div>
            <textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              placeholder="Enter bullet points (e.g. • Conduct market research...)"
              className="w-full h-32 p-3 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors resize-none leading-relaxed"
              id="offer-responsibilities-textarea"
            />
          </div>
        )}

        {/* Template cards */}
        {!loadingTemplates && templates.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {templates.slice(0, 8).map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl.id)}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  selectedTemplate === tpl.id
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border hover:border-border/80 hover:bg-muted/30'
                )}
              >
                <Briefcase
                  className={cn(
                    'w-5 h-5 mb-2',
                    selectedTemplate === tpl.id ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <p className="text-xs font-semibold text-foreground leading-snug">{tpl.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {tpl.roleTitle} · {tpl.salary}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Letters list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Generated Letters ({loadingLetters ? '...' : letters.length})
          </h3>
        </div>

        {loadingLetters ? (
          <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Loading letters...</p>
          </div>
        ) : letters.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No offer letters yet"
            description="Generate your first offer letter using the form above."
          />
        ) : (
          <div className="grid gap-3">
            {letters.map((letter) => (
              <div
                key={letter.id}
                className="glass-card rounded-2xl p-5 flex flex-wrap items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{letter.employeeName}</p>
                    <StatusBadge status={letter.status} />
                    {letter.roleTitle && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {letter.roleTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {letter.templateName} · Generated {formatDate(letter.generatedAt)}
                    {letter.sentAt && ` · Sent ${formatDate(letter.sentAt)}`}
                    {letter.salary && ` · ₹${letter.salary}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(letter)}
                    disabled={letter.status === 'Sent'}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title={letter.status === 'Sent' ? "Files deleted after email delivery" : "Download PDF"}
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                  {letter.status === 'Generated' && (
                    <button
                      onClick={() => handleSend(letter.id)}
                      disabled={sendingId === letter.id}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/20 transition-all disabled:opacity-60"
                      id={`send-offer-${letter.id}`}
                    >
                      {sendingId === letter.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" />
                      )}
                      Send Email
                    </button>
                  )}
                  {letter.status === 'Sent' && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Delivered (Files Deleted)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
