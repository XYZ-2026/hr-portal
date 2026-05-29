'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './AppShell';

// Shows AppShell (sidebar + navbar) only on authenticated pages, not on /login
export function ConditionalAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    // Login page renders without sidebar/navbar
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
