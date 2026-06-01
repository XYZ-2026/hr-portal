'use client';

import { useState } from 'react';
import {
  Settings,
  Building2,
  Mail,
  Key,
  Upload,
  CheckCircle,
  XCircle,
  Save,
  AlertTriangle,
  Globe,
  Phone,
  MapPin,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToastContext } from '@/components/providers/ToastProvider';
import { cn } from '@/lib/utils';

function SectionCard({ title, subtitle, icon: Icon, children }: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function StatusCard({ label, connected, description }: {
  label: string;
  connected: boolean;
  description: string;
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border',
      connected
        ? 'bg-emerald-400/5 border-emerald-400/20'
        : 'bg-red-400/5 border-red-400/20'
    )}>
      {connected ? (
        <CheckCircle className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
      ) : (
        <XCircle className="w-4.5 h-4.5 text-red-400 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <span
        className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
          connected
            ? 'bg-emerald-400/10 text-emerald-400'
            : 'bg-red-400/10 text-red-400'
        )}
      >
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

function InputField({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <input
        id={id}
        className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
        {...props}
      />
    </div>
  );
}

export default function SettingsPage() {
  const toast = useToastContext();
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState({
    name: 'College Simplified Pvt. Ltd.',
    email: 'hr@collegesimplified.in',
    phone: '+91 80000 12345',
    website: 'https://collegesimplified.in',
    address: '123, Education Enclave, Jayanagar, Bengaluru - 560041',
  });
  const [gmail, setGmail] = useState({
    clientId: '',
    clientSecret: '',
    connected: true,
  });
  const [smtp, setSmtp] = useState({
    host: 'smtp.gmail.com',
    port: '587',
    user: 'hr@collegesimplified.in',
    pass: '',
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSaving(false);
    toast.success('Settings saved!', 'Your configuration has been updated successfully.');
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Configure your HR portal preferences and integrations"
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 disabled:opacity-70"
            id="save-settings-btn"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        }
      />

      <div className="space-y-4">
        {/* Company Info */}
        <SectionCard
          title="Company Information"
          subtitle="Basic details about your organization"
          icon={Building2}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Company Name"
              id="company-name"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
            />
            <InputField
              label="HR Email"
              id="company-email"
              type="email"
              value={company.email}
              onChange={(e) => setCompany({ ...company, email: e.target.value })}
            />
            <InputField
              label="Phone"
              id="company-phone"
              value={company.phone}
              onChange={(e) => setCompany({ ...company, phone: e.target.value })}
            />
            <InputField
              label="Website"
              id="company-website"
              value={company.website}
              onChange={(e) => setCompany({ ...company, website: e.target.value })}
            />
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Address
              </label>
              <input
                id="company-address"
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
        </SectionCard>

        {/* Gmail API */}
        <SectionCard
          title="Gmail API Settings"
          subtitle="Connect your Google Workspace for sending emails"
          icon={Mail}
        >
          <div className="space-y-4">
            <StatusCard
              label="Gmail API"
              connected={gmail.connected}
              description="Used for sending offer letters and notifications"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Client ID"
                id="gmail-client-id"
                value={gmail.clientId}
                onChange={(e) => setGmail({ ...gmail, clientId: e.target.value })}
                placeholder="your-client-id.apps.googleusercontent.com"
              />
              <InputField
                label="Client Secret"
                id="gmail-client-secret"
                type="password"
                value={gmail.clientSecret}
                onChange={(e) => setGmail({ ...gmail, clientSecret: e.target.value })}
                placeholder="••••••••••••"
              />
            </div>
            <button className="flex items-center gap-2 h-9 px-4 rounded-xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/20 transition-all">
              <Key className="w-3.5 h-3.5" />
              Reconnect Gmail
            </button>
          </div>
        </SectionCard>

        {/* SMTP */}
        <SectionCard
          title="SMTP Configuration"
          subtitle="Fallback SMTP settings for email delivery"
          icon={Settings}
        >
          <div className="space-y-4">
            <StatusCard
              label="SMTP Server"
              connected={true}
              description="smtp.gmail.com:587 — TLS enabled"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="SMTP Host"
                id="smtp-host"
                value={smtp.host}
                onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
              />
              <InputField
                label="Port"
                id="smtp-port"
                value={smtp.port}
                onChange={(e) => setSmtp({ ...smtp, port: e.target.value })}
              />
              <InputField
                label="Username"
                id="smtp-user"
                value={smtp.user}
                onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
              />
              <InputField
                label="Password"
                id="smtp-pass"
                type="password"
                value={smtp.pass}
                onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>
        </SectionCard>

        {/* Template Upload */}
        <SectionCard
          title="Document Templates"
          subtitle="Upload custom letter and certificate templates"
          icon={Upload}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Offer Letter Template', type: 'offer', ext: '.docx / .pdf' },
              { label: 'Experience Letter Template', type: 'experience', ext: '.docx / .pdf' },
              { label: 'LOR Template', type: 'lor', ext: '.docx / .pdf' },
            ].map((tpl) => (
              <div
                key={tpl.type}
                className="border border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-muted/20 transition-all cursor-pointer group"
              >
                <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-xs font-semibold text-foreground text-center">{tpl.label}</p>
                <p className="text-[10px] text-muted-foreground">{tpl.ext}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  No file uploaded
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* HR Signature */}
        <SectionCard
          title="HR Signature"
          subtitle="Upload your digital signature for letters"
          icon={Settings}
        >
          <div className="flex items-start gap-4">
            <div className="w-40 h-20 rounded-xl border border-dashed border-border bg-muted/20 flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-primary/40 transition-colors">
              <span className="text-xs text-muted-foreground">Upload signature</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Sneha Iyer</p>
              <p className="text-xs text-muted-foreground mt-0.5">HR Manager · College Simplified</p>
              <div className="mt-3 flex gap-2">
                <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  Upload New
                </button>
                <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-400/20 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-all">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* API Status */}
        <SectionCard
          title="API Status"
          subtitle="Backend service connectivity"
          icon={Globe}
        >
          <div className="space-y-2">
            <StatusCard
              label="HR Portal Backend"
              connected={false}
              description="FastAPI backend at https://hr-portal-production-237f.up.railway.app"
            />
            <StatusCard
              label="Gmail API"
              connected={true}
              description="Google Workspace integration active"
            />
            <StatusCard
              label="PDF Generator"
              connected={true}
              description="Document generation service ready"
            />
          </div>
          <div className="mt-4 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                The backend API is not connected. The portal is running with mock data. 
                Set <code className="text-primary bg-primary/10 px-1 rounded">NEXT_PUBLIC_API_URL</code> in your <code className="text-primary bg-primary/10 px-1 rounded">.env.local</code> to connect.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
