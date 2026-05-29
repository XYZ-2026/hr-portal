'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Loader2, Sparkles } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isLoading) {
      if (!user && !isLoginPage) {
        router.replace('/login');
      } else if (user && isLoginPage) {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, isLoginPage, router]);

  // Full screen loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="w-12 h-12 rounded-2xl animated-gradient flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading HR Portal...</p>
      </div>
    );
  }

  // Not authenticated and not on login page — blank while redirecting
  if (!user && !isLoginPage) {
    return null;
  }

  // Authenticated but trying to access login — blank while redirecting
  if (user && isLoginPage) {
    return null;
  }

  return <>{children}</>;
}
