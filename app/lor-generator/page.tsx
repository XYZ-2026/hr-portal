'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Download, Mail, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectField } from '@/components/shared/SelectField';
import { useToastContext } from '@/components/providers/ToastProvider';
import { LOR } from '@/types';
import { formatDate } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { lorApi } from '@/services/api';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

export default function LORGeneratorPage() {
  const toast = useToastContext();
  const { employees, isLoading: loadingEmployees } = useEmployees();
  const [lors, setLors] = useState<LOR[]>([]);
  const [loadingLors, setLoadingLors] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Fetch LORs from Firestore
  useEffect(() => {
    const fetchLors = async () => {
      setLoadingLors(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'lors'));
        const list: LOR[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as LOR);
        });
        list.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
        setLors(list);
      } catch (err) {
        console.error('Failed to fetch LORs:', err);
      } finally {
        setLoadingLors(false);
      }
    };
    fetchLors();
  }, []);

  const activeEmployees = employees.filter((e) => e.status === 'Active');
  const activeEmployeeOptions = activeEmployees.map((emp) => ({
    value: emp.id,
    label: `${emp.name} — ${emp.role}`,
  }));

  const selectedEmpData = employees.find((e) => e.id === selectedEmp);

  const handleGenerate = async () => {
    if (!selectedEmp) {
      toast.warning('Missing selection', 'Please select an employee.');
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

      // Call the real backend — recommendation is auto-generated server-side
      const response = await lorApi.generate({
        employeeId: emp.employeeId || emp.id,
        employeeName: emp.name,
        employeeEmail: emp.email,
        role: emp.role,
        date: today,
      });

      const backendLor = response.data;

      // Persist to Firestore with filenames
      const docRef = doc(collection(db, 'lors'));
      const newLor: LOR = {
        id: docRef.id,
        employeeId: selectedEmp,
        employeeName: emp.name,
        employeeEmail: emp.email,
        role: emp.role,
        generatedAt: new Date().toISOString(),
        status: 'Generated',
        pdfFilename: backendLor.pdfFilename,
        pptxFilename: backendLor.pptxFilename,
      };

      await setDoc(docRef, newLor);
      setLors((prev) => [newLor, ...prev]);
      toast.success('LOR generated!', `Recommendation letter PDF for ${emp.name} is ready.`);
      setSelectedEmp('');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate LOR', err?.message || 'Server error. Make sure the backend is running.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (lor: LOR) => {
    if (!lor.pdfFilename || !lor.pptxFilename) {
      toast.warning('Cannot send', 'PDF files not found. Please regenerate this LOR.');
      return;
    }

    setSendingId(lor.id);
    try {
      await lorApi.send(lor.id, {
        employeeName: lor.employeeName,
        employeeEmail: lor.employeeEmail || '',
        pdfFilename: lor.pdfFilename,
        pptxFilename: lor.pptxFilename,
      });

      // Update Firestore status and clear filenames (deleted server-side)
      const docRef = doc(db, 'lors', lor.id);
      await updateDoc(docRef, {
        status: 'Sent',
        sentAt: new Date().toISOString(),
        pdfFilename: null,
        pptxFilename: null,
      });

      setLors((prev) =>
        prev.map((l) =>
          l.id === lor.id
            ? { ...l, status: 'Sent' as const, pdfFilename: undefined, pptxFilename: undefined }
            : l
        )
      );
      toast.success('LOR sent!', `Recommendation letter delivered to ${lor.employeeEmail || lor.employeeName}.`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to send LOR', err?.message || 'Server error while sending email.');
    } finally {
      setSendingId(null);
    }
  };

  const handleDownload = (lor: LOR) => {
    if (!lor.pdfFilename) {
      toast.warning('No PDF', 'PDF has already been sent and deleted from server.');
      return;
    }
    const url = lorApi.download(lor.id, lor.pdfFilename);
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="LOR Generator"
        subtitle="Create and email personalised letters of recommendation for your team"
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Form */}
        <div className="xl:col-span-3 glass-card rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">New Recommendation Letter</h3>
            <p className="text-xs text-muted-foreground mt-1">
              The recommendation body is professionally written — just fill in the employee and recipient details.
            </p>
          </div>

          {/* Employee */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Employee *
            </label>
            <SelectField
              id="lor-employee-select"
              value={selectedEmp}
              onChange={setSelectedEmp}
              placeholder={loadingEmployees ? 'Loading employees...' : 'Select employee...'}
              options={activeEmployeeOptions}
            />
          </div>

          {/* Information Notice */}

          {/* Common recommendation notice */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Common Recommendation Body (auto-generated)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The letter will include a professionally written recommendation paragraph describing the employee&apos;s
              dedication, professionalism, and contributions during their tenure at Concept Simplified.
            </p>
          </div>

          {/* Employee preview */}
          {selectedEmpData && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {selectedEmpData.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{selectedEmpData.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedEmpData.role} · {selectedEmpData.department} · {selectedEmpData.email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || loadingEmployees}
            className="w-full flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed"
            id="generate-lor-btn"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                Generate LOR
              </>
            )}
          </button>
        </div>

        {/* Generated LORs list */}
        <div className="xl:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Generated LORs ({loadingLors ? '...' : lors.length})
          </h3>
          {loadingLors ? (
            <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading LORs...</p>
            </div>
          ) : lors.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No LORs yet"
              description="Generate your first letter of recommendation."
            />
          ) : (
            lors.map((lor) => (
              <div key={lor.id} className="glass-card rounded-2xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {lor.employeeName}
                      </p>
                      <StatusBadge status={lor.status} />
                    </div>
                    {lor.recipientName || lor.recipientOrg ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        For {lor.recipientName} {lor.recipientOrg ? `· ${lor.recipientOrg}` : ''}
                      </p>
                    ) : (
                      lor.role && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Role: {lor.role}
                        </p>
                      )
                    )}
                    {lor.employeeEmail && (
                      <p className="text-[10px] text-muted-foreground">{lor.employeeEmail}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(lor.generatedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Download PDF — only if still on server */}
                  {lor.pdfFilename && lor.status === 'Generated' && (
                    <button
                      onClick={() => handleDownload(lor)}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                      id={`download-lor-${lor.id}`}
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </button>
                  )}
                  {lor.status === 'Generated' && (
                    <button
                      onClick={() => handleSend(lor)}
                      disabled={sendingId === lor.id}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
                      id={`send-lor-${lor.id}`}
                    >
                      {sendingId === lor.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Mail className="w-3 h-3" />
                      )}
                      Send
                    </button>
                  )}
                  {lor.status === 'Sent' && (
                    <span className="text-xs text-emerald-400 font-medium">✓ Sent</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
