import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '900'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | HR Portal',
    default: 'HR Portal — Modern HR Management',
  },
  description:
    'A comprehensive HR management portal for managing employees, offer letters, experience letters, and salary analytics.',
  keywords: ['HR', 'Human Resources', 'Employee Management', 'HR Portal', 'Offer Letters'],
  authors: [{ name: 'HR Portal Team' }],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AuthGuard>
                <LayoutShell>{children}</LayoutShell>
              </AuthGuard>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

// Separate shell so login page doesn't show sidebar/navbar
function LayoutShell({ children }: { children: React.ReactNode }) {
  return <ConditionalAppShell>{children}</ConditionalAppShell>;
}

// We need client-side routing check for conditional shell
import { ConditionalAppShell } from '@/components/layout/ConditionalAppShell';

