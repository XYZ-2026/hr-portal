'use client';

import { useState, useEffect } from 'react';
import { Award, Plus, Download, Mail, Loader2, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectField } from '@/components/shared/SelectField';
import { useToastContext } from '@/components/providers/ToastProvider';
import { ExperienceLetter } from '@/types';
import { formatDate, calculateTenure } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { experienceLetterApi } from '@/services/api';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

export default function ExperienceLettersPage() {
  const toast = useToastContext();
  const { employees, isLoading: loadingEmployees } = useEmployees();
  const [letters, setLetters] = useState<ExperienceLetter[]>([]);
  const [loadingLetters, setLoadingLetters] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [relievingDate, setRelievingDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Fetch experience letters from Firestore
  useEffect(() => {
    const fetchLetters = async () => {
      setLoadingLetters(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'experience_letters'));
        const list: ExperienceLetter[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as ExperienceLetter);
        });
        list.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
        setLetters(list);
      } catch (err) {
        console.error('Failed to fetch experience letters:', err);
      } finally {
        setLoadingLetters(false);
      }
    };
    fetchLetters();
  }, []);

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.name} — ${emp.department}`,
  }));

  const selectedEmpData = employees.find((e) => e.id === selectedEmp);
  const tenure = selectedEmpData && relievingDate
    ? calculateTenure(selectedEmpData.joiningDate, relievingDate)
    : null;

  const handleGenerate = async () => {
    if (!selectedEmp || !relievingDate) {
      toast.warning('Missing fields', 'Please select an employee and relieving date.');
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmp);
    if (!emp) return;

    if (!emp.email) {
      toast.warning('Missing email', 'Selected employee does not have an email address.');
      return;
    }

    setGenerating(true);
    try {
      const today = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const joiningDateFormatted = new Date(emp.joiningDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const relievingDateFormatted = new Date(relievingDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const duration = calculateTenure(emp.joiningDate, relievingDate);

      // Call the real backend to generate PDF
      const response = await experienceLetterApi.generate({
        employeeId: emp.employeeId || emp.id,
        employeeName: emp.name,
        employeeEmail: emp.email,
        role: emp.role,
        joiningDate: joiningDateFormatted,
        relievingDate: relievingDateFormatted,
        duration,
        date: today,
      });

      const backendLetter = response.data;

      // Persist to Firestore with filenames
      const docRef = doc(collection(db, 'experience_letters'));
      const newLetter: ExperienceLetter = {
        id: docRef.id,
        employeeId: selectedEmp,
        employeeName: emp.name,
        employeeEmail: emp.email,
        role: emp.role,
        joiningDate: emp.joiningDate,
        relievingDate,
        duration,
        generatedAt: new Date().toISOString(),
        status: 'Generated',
        pdfFilename: backendLetter.pdfFilename,
        pptxFilename: backendLetter.pptxFilename,
      };

      await setDoc(docRef, newLetter);
      setLetters((prev) => [newLetter, ...prev]);
      toast.success('Certificate generated!', `Experience letter PDF created for ${emp.name}`);
      setSelectedEmp('');
      setRelievingDate('');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate letter', err?.message || 'Server error. Make sure the backend is running.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (letter: ExperienceLetter) => {
    if (!letter.pdfFilename || !letter.pptxFilename) {
      toast.warning('Cannot send', 'PDF files not found. Please regenerate this letter.');
      return;
    }

    setSendingId(letter.id);
    try {
      await experienceLetterApi.send(letter.id, {
        employeeName: letter.employeeName,
        employeeEmail: letter.employeeEmail || '',
        role: letter.role || '',
        joiningDate: new Date(letter.joiningDate).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'long', year: 'numeric'
        }),
        relievingDate: new Date(letter.relievingDate).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'long', year: 'numeric'
        }),
        duration: letter.duration,
        pdfFilename: letter.pdfFilename,
        pptxFilename: letter.pptxFilename,
      });

      // Update Firestore status
      const docRef = doc(db, 'experience_letters', letter.id);
      await updateDoc(docRef, {
        status: 'Sent',
        sentAt: new Date().toISOString(),
        pdfFilename: null,
        pptxFilename: null,
      });

      setLetters((prev) =>
        prev.map((l) =>
          l.id === letter.id
            ? { ...l, status: 'Sent' as const, pdfFilename: undefined, pptxFilename: undefined }
            : l
        )
      );
      toast.success('Email sent!', `Experience letter delivered to ${letter.employeeEmail || letter.employeeName}.`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to send letter', err?.message || 'Server error while sending email.');
    } finally {
      setSendingId(null);
    }
  };

  const handleDownload = (letter: ExperienceLetter) => {
    if (!letter.pdfFilename) {
      toast.warning('No PDF', 'PDF has already been sent and deleted from server.');
      return;
    }
    const url = experienceLetterApi.download(letter.id, letter.pdfFilename);
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Experience Letters"
        subtitle="Generate and email experience certificates for current and former employees"
      />

      {/* Generator Panel */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Generate Experience Certificate
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Select Employee
            </label>
            <SelectField
              id="exp-employee-select"
              value={selectedEmp}
              onChange={setSelectedEmp}
              placeholder={loadingEmployees ? 'Loading employees...' : 'Choose employee...'}
              options={employeeOptions}
            />
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Last Working Day
            </label>
            <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-card focus-within:border-primary/50">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={relievingDate}
                onChange={(e) => setRelievingDate(e.target.value)}
                className="bg-transparent outline-none flex-1 text-sm text-foreground"
                id="exp-relieving-date"
              />
            </div>
          </div>

          {/* Auto-calculated tenure badge */}
          {tenure && (
            <div className="flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-sm font-semibold text-emerald-400 flex-shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              {tenure}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || loadingEmployees}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed flex-shrink-0"
            id="generate-exp-btn"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Generate Certificate
              </>
            )}
          </button>
        </div>

        {/* Employee preview */}
        {selectedEmpData && (
          <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {selectedEmpData.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedEmpData.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedEmpData.role} · Joined {formatDate(selectedEmpData.joiningDate)} · {selectedEmpData.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Letters list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Generated Certificates ({loadingLetters ? '...' : letters.length})
        </h3>

        {loadingLetters ? (
          <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Loading certificates...</p>
          </div>
        ) : letters.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No experience letters yet"
            description="Generate experience certificates for departing or former employees."
          />
        ) : (
          <div className="grid gap-3">
            {letters.map((letter) => (
              <div
                key={letter.id}
                className="glass-card rounded-2xl p-5 flex flex-wrap items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{letter.employeeName}</p>
                    <StatusBadge status={letter.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {letter.role && <span>{letter.role} · </span>}
                    Duration: {letter.duration} · Joined {formatDate(letter.joiningDate)} · Last day{' '}
                    {formatDate(letter.relievingDate)}
                  </p>
                  {letter.employeeEmail && (
                    <p className="text-[11px] text-muted-foreground">{letter.employeeEmail}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Download PDF — only available if PDF still exists on server */}
                  {letter.pdfFilename && letter.status === 'Generated' && (
                    <button
                      onClick={() => handleDownload(letter)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                      id={`download-exp-${letter.id}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  )}

                  {letter.status === 'Generated' && (
                    <button
                      onClick={() => handleSend(letter)}
                      disabled={sendingId === letter.id}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/20 transition-all disabled:opacity-60"
                      id={`send-exp-${letter.id}`}
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
                    <span className="text-xs text-emerald-400 font-medium">✓ Sent</span>
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
