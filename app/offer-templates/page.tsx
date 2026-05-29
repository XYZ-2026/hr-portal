'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Edit3, Trash2, Copy, Loader2, Briefcase, Clock, IndianRupee,
  CheckCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { TemplateEditorModal } from '@/components/offer-letters/TemplateEditorModal';
import { useToastContext } from '@/components/providers/ToastProvider';
import { OfferTemplate } from '@/types';
import { templateApi } from '@/services/api';
import { cn, formatDate } from '@/lib/utils';

export default function OfferTemplatesPage() {
  const toast = useToastContext();
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OfferTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch templates from backend
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await templateApi.getAll();
      setTemplates(res.data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      toast.error('Failed to load templates', 'Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = () => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const handleEdit = (tpl: OfferTemplate) => {
    setEditingTemplate(tpl);
    setModalOpen(true);
  };

  const handleDuplicate = async (tpl: OfferTemplate) => {
    try {
      const res = await templateApi.create({
        name: `${tpl.name} (Copy)`,
        roleTitle: tpl.roleTitle,
        responsibilities: tpl.responsibilities,
        salary: tpl.salary,
        duration: tpl.duration,
        emailSubject: tpl.emailSubject,
        emailBody: tpl.emailBody,
      });
      setTemplates((prev) => [...prev, res.data]);
      toast.success('Template duplicated!', `Created copy of "${tpl.name}"`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to duplicate', 'Could not save the template.');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await templateApi.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Template deleted', 'The template has been removed.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete', 'Could not delete the template.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async (data: Partial<OfferTemplate>) => {
    if (editingTemplate) {
      // Update existing
      const res = await templateApi.update(editingTemplate.id, data);
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? res.data : t))
      );
      toast.success('Template updated!', `"${data.name}" has been saved.`);
    } else {
      // Create new
      const res = await templateApi.create(data as {
        name: string;
        roleTitle: string;
        responsibilities: string;
        salary?: string;
        duration?: string;
        emailSubject?: string;
        emailBody?: string;
      });
      setTemplates((prev) => [...prev, res.data]);
      toast.success('Template created!', `"${data.name}" is ready to use.`);
    }
  };

  // Count lines in responsibilities for a visual indicator
  const countBullets = (text: string) =>
    text.split('\n').filter((l) => l.trim().startsWith('•')).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Offer Templates"
        subtitle="Manage role-specific templates for offer letter generation"
        actions={
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/25"
            id="create-template-btn"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        }
      />

      {/* Stats bar */}
      {!loading && templates.length > 0 && (
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span><strong className="text-foreground">{templates.length}</strong> templates</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Briefcase className="w-3.5 h-3.5" />
            <span><strong className="text-foreground">{templates.filter(t => t.isDefault).length}</strong> default</span>
          </div>
        </div>
      )}

      {/* Template Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-card border border-border rounded-2xl shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create your first offer letter template to get started."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-card border border-border rounded-2xl p-5 flex flex-col group hover:border-primary/40 transition-all shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">{tpl.roleTitle}</p>
                  </div>
                </div>
                {tpl.isDefault && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex-shrink-0">
                    Default
                  </span>
                )}
              </div>

              {/* Responsibilities preview */}
              <div className="flex-1 mb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Responsibilities ({countBullets(tpl.responsibilities)} items)
                </p>
                <div className="text-xs text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-line">
                  {tpl.responsibilities}
                </div>
              </div>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  <IndianRupee className="w-3 h-3" />
                  {tpl.salary}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  <Clock className="w-3 h-3" />
                  {tpl.duration}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => handleEdit(tpl)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  title="Edit template"
                  id={`edit-tpl-${tpl.id}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDuplicate(tpl)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  title="Duplicate template"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => handleDelete(tpl.id)}
                  disabled={deletingId === tpl.id}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-400/20 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                  title="Delete template"
                >
                  {deletingId === tpl.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <TemplateEditorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        template={editingTemplate}
      />
    </div>
  );
}
