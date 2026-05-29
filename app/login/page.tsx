'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Sparkles, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const { login, error, clearError, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // error is set in context
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

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo.png"
            alt="College Simplified"
            className="w-14 h-14 rounded-full mb-4 shadow-2xl shadow-primary/30 object-cover"
          />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">HR Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Admin access only</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl border border-border p-8 shadow-2xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Sign in to your account</h2>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Authorized personnel only
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Email Address
              </label>
              <div className={cn(
                'flex items-center gap-2.5 h-11 px-3.5 rounded-xl border bg-muted/30 transition-all',
                'focus-within:border-primary/50 focus-within:bg-background',
                error ? 'border-red-500/30' : 'border-border'
              )}>
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="admin@collegesimplified.in"
                  autoComplete="email"
                  required
                  className="bg-transparent outline-none flex-1 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className={cn(
                'flex items-center gap-2.5 h-11 px-3.5 rounded-xl border bg-muted/30 transition-all',
                'focus-within:border-primary/50 focus-within:bg-background',
                error ? 'border-red-500/30' : 'border-border'
              )}>
                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="bg-transparent outline-none flex-1 text-sm text-foreground placeholder:text-muted-foreground"
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

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isSubmitting || !email || !password}
              className={cn(
                'w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2',
                'bg-primary text-primary-foreground transition-all',
                'hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none',
                'mt-2'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-5 leading-relaxed">
            This portal is restricted to authorized HR administrators only.
          </p>
        </div>

        {/* Version tag */}
        <p className="text-center text-[10px] text-muted-foreground/50 mt-4">
          HR Portal v1.0 · College Simplified
        </p>
      </div>
    </div>
  );
}
