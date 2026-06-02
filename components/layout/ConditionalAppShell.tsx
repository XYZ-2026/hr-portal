'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './AppShell';

// Shows AppShell (sidebar + navbar) only on authenticated pages, not on /login or /register-employee
export function ConditionalAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register-employee';

  if (isLoginPage || isRegisterPage) {
    // Public pages render without sidebar/navbar
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
