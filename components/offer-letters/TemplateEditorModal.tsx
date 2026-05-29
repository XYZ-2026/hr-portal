'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Sparkles } from 'lucide-react';
import { OfferTemplate } from '@/types';
import { cn } from '@/lib/utils';

interface TemplateEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<OfferTemplate>) => Promise<void>;
  template: OfferTemplate | null; // null = create mode
}

const PLACEHOLDERS_HELP = [
  { tag: '{{NAME}}', desc: 'Employee full name' },
  { tag: '{{SALARY}}', desc: 'Monthly salary/stipend' },
  { tag: '{{START_DATE}}', desc: 'Internship start date' },
  { tag: '{{END_DATE}}', desc: 'Internship end date' },
  { tag: '{{ROLE}}', desc: 'Role title' },
];

export function TemplateEditorModal({ open, onClose, onSave, template }: TemplateEditorModalProps) {
  const isEdit = template !== null;

  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [salary, setSalary] = useState('10,000 Per Month');
  const [duration, setDuration] = useState('3 months');
  const [emailSubject, setEmailSubject] = useState('Offer Letter - {{NAME}}');
  const [emailBody, setEmailBody] = useState('');
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (template) {
      setName(template.name);
      setRoleTitle(template.roleTitle);
      setResponsibilities(template.responsibilities);
      setSalary(template.salary);
      setDuration(template.duration);
      setEmailSubject(template.emailSubject);
      setEmailBody(template.emailBody);
    } else {
      setName('');
      setRoleTitle('');
      setResponsibilities('');
      setSalary('10,000 Per Month');
      setDuration('3 months');
      setEmailSubject('Offer Letter - {{NAME}}');
      setEmailBody('');
    }
  }, [template, open]);

  const handleSave = async () => {
    if (!name.trim() || !roleTitle.trim() || !responsibilities.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        roleTitle: roleTitle.trim(),
        responsibilities: responsibilities.trim(),
        salary: salary.trim(),
        duration: duration.trim(),
        emailSubject: emailSubject.trim(),
        emailBody: emailBody.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: 'hsl(var(--card))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isEdit ? 'Edit Template' : 'Create New Template'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? `Editing "${template.name}"`
                  : 'Define a new role template with responsibilities and email body'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Row 1: Name + Role Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Template Name *
              </label>
              <input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Growth Intern"
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Role Title *
              </label>
              <input
                id="tpl-role-title"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Growth Intern"
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Salary + Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Default Salary
              </label>
              <input
                id="tpl-salary"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. 15,000 Per Month"
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Duration
              </label>
              <input
                id="tpl-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 3 months"
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Responsibilities */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Roles & Responsibilities *
            </label>
            <textarea
              id="tpl-responsibilities"
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              placeholder="• Conduct market research and competitor analysis&#10;• Assist in planning and executing campaigns&#10;• Create engaging content for social media"
              rows={6}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors resize-none leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Use bullet points (•) for each responsibility. One per line.
            </p>
          </div>

          {/* Email Subject */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Email Subject Template
            </label>
            <input
              id="tpl-email-subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Offer Letter - {{NAME}}"
              className="w-full h-10 px-3 rounded-xl border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Email Body Template
            </label>
            <textarea
              id="tpl-email-body"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Dear {{NAME}},&#10;&#10;Congratulations!&#10;&#10;We are delighted to offer you..."
              rows={8}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors resize-none leading-relaxed font-mono text-xs"
            />
          </div>

          {/* Placeholder help */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">
              Available Placeholders
            </p>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDERS_HELP.map((ph) => (
                <div
                  key={ph.tag}
                  className="flex items-center gap-1.5 text-[11px]"
                >
                  <code className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono font-semibold">
                    {ph.tag}
                  </code>
                  <span className="text-muted-foreground">{ph.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !roleTitle.trim() || !responsibilities.trim()}
            className={cn(
              'flex items-center gap-2 h-9 px-5 rounded-xl text-sm font-semibold transition-all',
              'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/25',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
            id="save-template-btn"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                {isEdit ? 'Update Template' : 'Create Template'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
