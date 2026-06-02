'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Loader2, Sparkles } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading, isAdmin, isEmployee } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register-employee';
  const isPublicPage = isLoginPage || isRegisterPage;

  useEffect(() => {
    if (!isLoading) {
      if (!user && !isPublicPage) {
        router.replace('/login');
      } else if (user) {
        if (isLoginPage) {
          if (isAdmin) {
            router.replace('/dashboard');
          } else {
            router.replace('/employee-dashboard');
          }
        } else if (!isRegisterPage) {
          const isAdminRoute = [
            '/dashboard',
            '/employees',
            '/offer-letters',
            '/offer-templates',
            '/experience-letters',
            '/lor-generator',
            '/salary-analytics',
            '/settings',
            '/daily-summaries',
            '/payments',
          ].some((route) => pathname === route || pathname.startsWith(route + '/'));

          const isEmployeeRoute = pathname === '/employee-dashboard' || pathname.startsWith('/employee-dashboard/');

          if (isEmployee && isAdminRoute) {
            router.replace('/employee-dashboard');
          } else if (isAdmin && isEmployeeRoute) {
            router.replace('/dashboard');
          }
        }
      }
    }
  }, [user, isLoading, isLoginPage, isRegisterPage, isPublicPage, isAdmin, isEmployee, pathname, router]);

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

  // Not authenticated and not on a public page — blank while redirecting
  if (!user && !isPublicPage) {
    return null;
  }

  // Authenticated but trying to access login — blank while redirecting
  if (user && isLoginPage) {
    return null;
  }

  const isAdminRoute = [
    '/dashboard',
    '/employees',
    '/offer-letters',
    '/offer-templates',
    '/experience-letters',
    '/lor-generator',
    '/salary-analytics',
    '/settings',
    '/daily-summaries',
    '/payments',
  ].some((route) => pathname === route || pathname.startsWith(route + '/'));

  const isEmployeeRoute = pathname === '/employee-dashboard' || pathname.startsWith('/employee-dashboard/');

  if (user && isEmployee && isAdminRoute) {
    return null;
  }

  if (user && isAdmin && isEmployeeRoute) {
    return null;
  }

  return <>{children}</>;
}
