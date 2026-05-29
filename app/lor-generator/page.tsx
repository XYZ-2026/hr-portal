'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Download, Mail, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectField } from '@/components/shared/SelectField';
import { useToastContext } from '@/components/providers/ToastProvider';
import { LOR } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

const DEFAULT_RECOMMENDATION = `I am writing to highly recommend [Employee Name] for [Position/Program]. During their tenure at College Simplified, they have consistently demonstrated exceptional [skills/qualities].

[Employee Name] has been an invaluable member of our team, contributing significantly to [specific projects/achievements]. Their dedication, technical expertise, and collaborative spirit have made them a standout performer.

I wholeheartedly endorse [Employee Name] for this opportunity and am confident they will bring the same level of excellence and commitment to your organization.`;

export default function LORGeneratorPage() {
  const toast = useToastContext();
  const { employees, isLoading: loadingEmployees } = useEmployees();
  const [lors, setLors] = useState<LOR[]>([]);
  const [loadingLors, setLoadingLors] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientOrg, setRecipientOrg] = useState('');
  const [recommendation, setRecommendation] = useState(DEFAULT_RECOMMENDATION);
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
  const charCount = recommendation.length;
  const minChars = 200;

  const handleGenerate = async () => {
    if (!selectedEmp || !recipientName || !recipientOrg) {
      toast.warning('Missing fields', 'Please fill all required fields.');
      return;
    }
    if (charCount < minChars) {
      toast.warning('Recommendation too short', `Please write at least ${minChars} characters.`);
      return;
    }

    setGenerating(true);
    try {
      const emp = employees.find((e) => e.id === selectedEmp);
      const docRef = doc(collection(db, 'lors'));
      
      const newLor: LOR = {
        id: docRef.id,
        employeeId: selectedEmp,
        employeeName: emp?.name || '',
        recipientName,
        recipientOrg,
        recommendation,
        generatedAt: new Date().toISOString(),
        status: 'Generated',
      };
      
      await setDoc(docRef, newLor);
      setLors((prev) => [newLor, ...prev]);
      toast.success('LOR generated!', `Recommendation letter for ${emp?.name} is ready.`);
      setSelectedEmp('');
      setRecipientName('');
      setRecipientOrg('');
      setRecommendation(DEFAULT_RECOMMENDATION);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate LOR', 'Unable to save to Firestore.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (id: string) => {
    setSendingId(id);
    try {
      const docRef = doc(db, 'lors', id);
      await updateDoc(docRef, { status: 'Sent' });
      setLors((prev) =>
        prev.map((l) => l.id === id ? { ...l, status: 'Sent' as const } : l)
      );
      toast.success('LOR sent!', 'Recommendation letter has been delivered.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send LOR', 'Could not update status in database.');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="LOR Generator"
        subtitle="Create personalized letters of recommendation for your team"
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Form */}
        <div className="xl:col-span-3 glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">New Recommendation Letter</h3>

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

          {/* Recipient row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Recipient / Institution *
              </label>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Harvard Business School"
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                id="lor-recipient-name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Organization *
              </label>
              <input
                value={recipientOrg}
                onChange={(e) => setRecipientOrg(e.target.value)}
                placeholder="e.g. Harvard University"
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                id="lor-recipient-org"
              />
            </div>
          </div>

          {/* Recommendation textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recommendation Text *
              </label>
              <span
                className={cn(
                  'text-xs font-medium',
                  charCount < minChars ? 'text-amber-400' : 'text-muted-foreground'
                )}
              >
                {charCount}/{minChars} min chars
              </span>
            </div>
            <textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={8}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors resize-none leading-relaxed"
              id="lor-recommendation-text"
            />
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
                  {selectedEmpData.role} · {selectedEmpData.department} · Since{' '}
                  {formatDate(selectedEmpData.joiningDate)}
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
                Generating LOR...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                Generate LOR
              </>
            )}
          </button>
        </div>

        {/* Generated LORs */}
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
                    <BookOpen className="w-4.5 h-4.5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {lor.employeeName}
                      </p>
                      <StatusBadge status={lor.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      For {lor.recipientName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(lor.generatedAt)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                  {lor.recommendation.slice(0, 120)}...
                </p>

                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
                    <Download className="w-3 h-3" />
                    PDF
                  </button>
                  {lor.status === 'Generated' && (
                    <button
                      onClick={() => handleSend(lor.id)}
                      disabled={sendingId === lor.id}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
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
