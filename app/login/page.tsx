'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Shield,
  User,
  Briefcase,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Department } from '@/types';

const DEPARTMENTS: Department[] = [
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations',
  'Product',
];

export default function LoginPage() {
  const { login, signup, error, clearError, isLoading: authLoading } = useAuth();
  
  // Toggles between 'signin' and 'signup'
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState<Department>('Engineering');

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      if (activeTab === 'signin') {
        // Universal Sign In for both admins and employees
        await login(email, password);
      } else {
        // Employee Sign Up
        await signup(email, password, name, department, role);
      }
    } catch {
      // Error is stored and handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitting = submitting || authLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/8 rounded-full blur-3xl pointer-events-none" />

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4 py-8 animate-in fade-in duration-300">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo.png"
            alt="College Simplified"
            className="w-14 h-14 rounded-full mb-3 shadow-2xl shadow-primary/30 object-cover"
          />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">HR Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Management Suite · College Simplified</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl border border-border p-6 sm:p-8 shadow-2xl w-full flex flex-col justify-between transition-all duration-300">
          <div>
            {/* Top Navigation Tabs */}
            <div className="flex border-b border-border/40 mb-6">
              <button
                type="button"
                onClick={() => { setActiveTab('signin'); clearError(); }}
                className={cn(
                  'flex-1 pb-3 text-xs font-bold transition-all relative',
                  activeTab === 'signin' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Sign In
                {activeTab === 'signin' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('signup'); clearError(); }}
                className={cn(
                  'flex-1 pb-3 text-xs font-bold transition-all relative',
                  activeTab === 'signup' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Create Account
                {activeTab === 'signup' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Forms */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* NAME FIELD (only during Employee Signup) */}
              {activeTab === 'signup' && (
                <div className="page-enter">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Full Name
                  </label>
                  <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-border bg-muted/20 transition-all focus-within:border-primary/50 focus-within:bg-background overflow-hidden">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ring-0 p-0 flex-1 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              {/* EMAIL ADDRESS */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Email Address
                </label>
                <div className={cn(
                  'flex items-center gap-2.5 h-11 px-3.5 rounded-xl border bg-muted/20 transition-all overflow-hidden',
                  'focus-within:border-primary/50 focus-within:bg-background',
                  error ? 'border-red-500/20' : 'border-border'
                )}>
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    placeholder="jane.doe@example.com"
                    autoComplete="email"
                    required
                    className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ring-0 p-0 flex-1 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* DEPARTMENT & ROLE FIELDS (only during Signup, stacked vertically) */}
              {activeTab === 'signup' && (
                <div className="space-y-4 page-enter">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Department
                    </label>
                    <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-border bg-muted/20 transition-all focus-within:border-primary/50 focus-within:bg-background overflow-hidden">
                      <Building className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value as Department)}
                        className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ring-0 p-0 flex-1 text-sm text-foreground appearance-none cursor-pointer [color-scheme:dark] dark:[color-scheme:dark] w-full"
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept} style={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Job Title / Role
                    </label>
                    <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-border bg-muted/20 transition-all focus-within:border-primary/50 focus-within:bg-background overflow-hidden">
                      <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="UI Designer"
                        required
                        className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ring-0 p-0 flex-1 text-sm text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PASSWORD */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Password
                </label>
                <div className={cn(
                  'flex items-center gap-2.5 h-11 px-3.5 rounded-xl border bg-muted/20 transition-all overflow-hidden',
                  'focus-within:border-primary/50 focus-within:bg-background',
                  error ? 'border-red-500/20' : 'border-border'
                )}>
                  <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    placeholder="••••••••"
                    autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
                    required
                    className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ring-0 p-0 flex-1 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting || !email || !password}
                className={cn(
                  'w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2',
                  'bg-primary text-primary-foreground transition-all duration-200',
                  'hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25',
                  'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none',
                  'mt-4'
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {activeTab === 'signup' ? 'Registering...' : 'Signing in...'}
                  </>
                ) : activeTab === 'signin' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
            {activeTab === 'signin'
              ? 'Authorized dashboard sign-in. Access matches your registered staff configuration.'
              : 'Register your corporate employee profile to activate shift clock tracking and logs.'}
          </p>
        </div>

        {/* Version tag */}
        <p className="text-center text-[10px] text-muted-foreground/50 mt-4">
          HR Portal v1.3 · College Simplified
        </p>
      </div>
    </div>
  );
}
