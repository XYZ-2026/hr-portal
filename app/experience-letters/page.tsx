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
    setGenerating(true);
    try {
      const emp = employees.find((e) => e.id === selectedEmp);
      const docRef = doc(collection(db, 'experience_letters'));
      
      const newLetter: ExperienceLetter = {
        id: docRef.id,
        employeeId: selectedEmp,
        employeeName: emp?.name || '',
        joiningDate: emp?.joiningDate || '',
        relievingDate,
        duration: tenure || '',
        generatedAt: new Date().toISOString(),
        status: 'Generated',
      };
      
      await setDoc(docRef, newLetter);
      setLetters((prev) => [newLetter, ...prev]);
      toast.success('Certificate generated!', `Experience letter created for ${emp?.name}`);
      setSelectedEmp('');
      setRelievingDate('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate letter', 'Unable to save to Firestore.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (id: string) => {
    setSendingId(id);
    try {
      const docRef = doc(db, 'experience_letters', id);
      await updateDoc(docRef, { status: 'Sent' });
      setLetters((prev) =>
        prev.map((l) => l.id === id ? { ...l, status: 'Sent' as const } : l)
      );
      toast.success('Email sent!', 'Experience letter delivered to employee.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send letter', 'Could not update status in database.');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Experience Letters"
        subtitle="Generate experience certificates for current and former employees"
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
                Generating...
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
                {selectedEmpData.role} · Joined {formatDate(selectedEmpData.joiningDate)}
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
                    Duration: {letter.duration} · Joined {formatDate(letter.joiningDate)} · Last day{' '}
                    {formatDate(letter.relievingDate)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                  {letter.status === 'Generated' && (
                    <button
                      onClick={() => handleSend(letter.id)}
                      disabled={sendingId === letter.id}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/20 transition-all disabled:opacity-60"
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
