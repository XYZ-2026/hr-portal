'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  User,
  FileText,
  Award,
  BookOpen,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  X,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/components/providers/AuthProvider';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { employees } = useEmployees();
  const { isAdmin, isEmployee, user } = useAuth();

  const activeEmployees = employees.filter((e) => e.status === 'Active').length;
  const totalEmployees = employees.length;
  const progressPercent = totalEmployees > 0 ? (activeEmployees / totalEmployees) * 100 : 0;

  const navItems: NavItem[] = isAdmin
    ? [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard className="w-4.5 h-4.5" />,
      },
      {
        label: 'Employees',
        href: '/employees',
        icon: <Users className="w-4.5 h-4.5" />,
      },
      {
        label: 'Employee Details',
        href: '/employee-details',
        icon: <FileText className="w-4.5 h-4.5" />,
        badge: 'Onboard',
      },
      {
        label: 'Daily Summaries',
        href: '/daily-summaries',
        icon: <FileText className="w-4.5 h-4.5" />,
        badge: 'New',
      },
      {
        label: 'Offer Letters',
        href: '/offer-letters',
        icon: <FileText className="w-4.5 h-4.5" />,
      },
      {
        label: 'Offer Templates',
        href: '/offer-templates',
        icon: <Layers className="w-4.5 h-4.5" />,
        badge: 'New',
      },
      {
        label: 'Experience Letters',
        href: '/experience-letters',
        icon: <Award className="w-4.5 h-4.5" />,
      },
      {
        label: 'LOR Generator',
        href: '/lor-generator',
        icon: <BookOpen className="w-4.5 h-4.5" />,
        badge: 'New',
      },
      {
        label: 'Salary Analytics',
        href: '/salary-analytics',
        icon: <BarChart3 className="w-4.5 h-4.5" />,
      },
      {
        label: 'Payments',
        href: '/payments',
        icon: <DollarSign className="w-4.5 h-4.5" />,
        badge: 'New',
      },
      {
        label: 'Settings',
        href: '/settings',
        icon: <Settings className="w-4.5 h-4.5" />,
      },
    ]
    : [
      {
        label: 'Shift Control',
        href: '/employee-dashboard',
        icon: <LayoutDashboard className="w-4.5 h-4.5" />,
      },
      {
        label: 'Shift History',
        href: '/employee-dashboard/history',
        icon: <FileText className="w-4.5 h-4.5" />,
        badge: 'New',
      },
      {
        label: 'Register Employee',
        href: '/register-employee',
        icon: <User className="w-4.5 h-4.5" />,
        badge: 'Onboard',
      },
    ];

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col',
        'bg-card border-r border-border',
        'sidebar-transition',
        // Desktop
        'hidden md:flex',
        collapsed ? 'md:w-[72px]' : 'md:w-[260px]',
        // Mobile
        'md:relative md:translate-x-0',
        mobileOpen ? 'flex w-[260px] translate-x-0' : '-translate-x-full',
        'transition-transform md:transition-[width]'
      )}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-border flex-shrink-0',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="College Simplified"
              className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
            />
            <div>
              <p className="text-sm font-bold text-foreground leading-none">College Simplified</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Management Suite</p>
            </div>
          </div>
        )}
        {collapsed && (
          <img
            src="/logo.png"
            alt="College Simplified"
            className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
          />
        )}

        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1 rounded-lg hover:bg-muted text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' &&
              item.href !== '/employee-dashboard' &&
              item.href !== '/dashboard' &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-150 group relative',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
              )}

              <span
                className={cn(
                  'flex-shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              >
                {item.icon}
              </span>

              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/20 text-primary">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-border flex-shrink-0">
        {!collapsed && isAdmin && (
          <div className="mb-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-xs font-semibold text-foreground">College Simplified</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {activeEmployees} Active Employee{activeEmployees !== 1 ? 's' : ''}
            </p>
            <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {!collapsed && isEmployee && (
          <div className="mb-3 p-3 rounded-xl bg-primary/5 border border-primary/10 flex flex-col gap-1">
            <p className="text-xs font-bold text-foreground truncate">{user?.displayName || 'Employee'}</p>
            <p className="text-[10px] text-muted-foreground font-mono truncate">{user?.email}</p>
            <span className="inline-flex self-start text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary mt-1">
              Employee Portal
            </span>
          </div>
        )}

        {/* Collapse toggle - desktop only */}
        <button
          onClick={onToggle}
          className={cn(
            'hidden md:flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium',
            'text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
