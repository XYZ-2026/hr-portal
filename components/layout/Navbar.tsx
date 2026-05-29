'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  Search,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  User,
  HelpCircle,
  Shield,
  Command,
  Plus,
  FileText,
  Award,
  BookOpen,
  Settings,
  LayoutDashboard,
  Users,
  CornerDownLeft,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEmployees } from '@/hooks/useEmployees';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview & analytics' },
  '/employees': { title: 'Employees', subtitle: 'Manage your team' },
  '/offer-letters': { title: 'Offer Letters', subtitle: 'Generate & send offer letters' },
  '/experience-letters': { title: 'Experience Letters', subtitle: 'Issue experience certificates' },
  '/lor-generator': { title: 'LOR Generator', subtitle: 'Create recommendation letters' },
  '/salary-analytics': { title: 'Salary Analytics', subtitle: 'Compensation insights' },
  '/settings': { title: 'Settings', subtitle: 'Configure your portal' },
};

interface NavbarProps {
  onMobileMenuToggle: () => void;
  sidebarCollapsed: boolean;
}

export function Navbar({ onMobileMenuToggle }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { employees } = useEmployees();
  
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);

  const pageInfo =
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ||
    PAGE_TITLES['/dashboard'];

  // Derive display info from Firebase user
  const displayName = user?.displayName || 'Admin';
  const displayEmail = user?.email || '';
  const displayRole = 'HR Administrator';

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  // Spotlight Command Palette configuration
  const QUICK_ACTIONS = [
    { id: 'add-emp', label: 'Add New Employee', description: 'Onboard a new employee', href: '/employees?add=true', icon: <Plus className="w-4 h-4 text-emerald-400" /> },
    { id: 'nav-dash', label: 'Go to Dashboard', description: 'Overview and analytics', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4 text-sky-400" /> },
    { id: 'nav-emp', label: 'Go to Employees List', description: 'View and manage team', href: '/employees', icon: <Users className="w-4 h-4 text-indigo-400" /> },
    { id: 'nav-offer', label: 'Go to Offer Letters', description: 'Generate offer letters', href: '/offer-letters', icon: <FileText className="w-4 h-4 text-amber-400" /> },
    { id: 'nav-exp', label: 'Go to Experience Letters', description: 'Issue experience letters', href: '/experience-letters', icon: <Award className="w-4 h-4 text-rose-400" /> },
    { id: 'nav-lor', label: 'Go to LOR Generator', description: 'Create recommendation letters', href: '/lor-generator', icon: <BookOpen className="w-4 h-4 text-violet-400" /> },
    { id: 'nav-settings', label: 'Go to Settings', description: 'Configure HR preferences', href: '/settings', icon: <Settings className="w-4 h-4 text-slate-400" /> },
  ];

  // Listen to ⌘K or Ctrl+K keydown event
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, []);

  // Autofocus input when palette opens
  useEffect(() => {
    if (commandPaletteOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        paletteInputRef.current?.focus();
      }, 50);
    }
  }, [commandPaletteOpen]);

  // Dynamic search results
  const filteredEmployees = searchQuery.trim() === ''
    ? []
    : employees.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);

  const filteredActions = searchQuery.trim() === ''
    ? QUICK_ACTIONS
    : QUICK_ACTIONS.filter(act =>
        act.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.description.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const combinedResults = [
    ...filteredEmployees.map(emp => ({
      type: 'employee' as const,
      id: emp.id,
      label: emp.name,
      subtitle: `${emp.role} · ${emp.department || 'Unassigned'}`,
      href: `/employees?search=${encodeURIComponent(emp.name)}`,
      badge: emp.status,
    })),
    ...filteredActions.map(act => ({
      type: 'action' as const,
      id: act.id,
      label: act.label,
      subtitle: act.description,
      href: act.href,
      icon: act.icon,
    })),
  ];

  const handleSelect = (item: typeof combinedResults[number]) => {
    setCommandPaletteOpen(false);
    router.push(item.href);
  };

  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (combinedResults.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % combinedResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + combinedResults.length) % combinedResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(combinedResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCommandPaletteOpen(false);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0 flex items-center px-4 md:px-6 gap-4 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        id="mobile-menu-button"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title (mobile) */}
      <div className="md:flex-1 md:hidden">
        <p className="text-sm font-semibold text-foreground">{pageInfo.title}</p>
      </div>

      {/* Spotlight Trigger Search Button */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className={cn(
          'hidden md:flex items-center gap-2.5 h-9 px-3 rounded-xl border transition-all duration-150',
          'bg-muted/40 text-muted-foreground text-sm border-border/40 hover:border-border w-64 hover:bg-muted/70 text-left cursor-pointer group shadow-inner'
        )}
        id="global-search-trigger"
        title="Search or press ⌘K"
      >
        <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
        <span className="flex-1 text-muted-foreground/70 text-xs select-none">Search employees, actions...</span>
        <kbd className="hidden sm:flex items-center gap-0.5 text-[9px] text-muted-foreground border border-border/40 bg-card rounded px-1.5 py-0.5 font-sans leading-none font-bold">
          ⌘K
        </kbd>
      </button>

      {/* Spacer */}
      <div className="hidden md:block flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          id="theme-toggle"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          id="notifications-button"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              'flex items-center gap-2.5 h-9 pl-1 pr-2.5 rounded-xl transition-all',
              'hover:bg-muted border border-transparent',
              userMenuOpen && 'bg-muted border-border/50'
            )}
            id="user-menu-button"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-primary">
                {displayName !== 'Admin' ? getInitials(displayName) : 'AD'}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-foreground leading-none">{displayEmail.split('@')[0]}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{displayRole}</p>
            </div>
            <ChevronDown
              className={cn(
                'hidden sm:block w-3.5 h-3.5 text-muted-foreground transition-transform',
                userMenuOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-56 glass-card rounded-xl border border-border shadow-xl p-1">
                <div className="px-3 py-2.5 border-b border-border mb-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Shield className="w-3 h-3 text-primary flex-shrink-0" />
                    <p className="text-xs font-semibold text-foreground">Admin</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{displayEmail}</p>
                </div>
                <button
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User className="w-3.5 h-3.5" />
                  Profile
                </button>
                <button
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Help & Support
                </button>
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-all"
                    id="logout-button"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Spotlight Command Palette Modal */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          {/* Backdrop blur overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setCommandPaletteOpen(false)}
          />

          {/* Dialog Container */}
          <div
            className="relative z-10 w-full max-w-xl bg-card/95 border border-border shadow-2xl rounded-2xl overflow-hidden glass-card animate-in fade-in slide-in-from-top-4 duration-200"
            onKeyDown={handlePaletteKeyDown}
          >
            {/* Input field */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-muted/20">
              <Search className="w-4.5 h-4.5 text-muted-foreground flex-shrink-0" />
              <input
                ref={paletteInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type to search employees, actions..."
                className="bg-transparent outline-none flex-1 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <span className="text-[10px] bg-muted border border-border/80 text-muted-foreground px-1.5 py-0.5 rounded shadow-sm">
                ESC
              </span>
            </div>

            {/* Results body */}
            <div className="max-h-[360px] overflow-y-auto p-2 space-y-3">
              {combinedResults.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm font-medium">No results found for &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">Try searching for names, roles, or navigation links.</p>
                </div>
              ) : (
                <>
                  {/* Matching Employees Section */}
                  {filteredEmployees.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-1 mb-1">
                        Employees
                      </p>
                      <div className="space-y-0.5">
                        {combinedResults
                          .filter(r => r.type === 'employee')
                          .map((item) => {
                            const actualIndex = combinedResults.indexOf(item);
                            const isActive = actualIndex === selectedIndex;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setSelectedIndex(actualIndex)}
                                className={cn(
                                  'flex items-center justify-between w-full px-3 py-2 rounded-xl text-left transition-all cursor-pointer',
                                  isActive
                                    ? 'bg-primary/10 text-foreground border-l-2 border-primary'
                                    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-xs flex-shrink-0">
                                    {getInitials(item.label)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                                  </div>
                                </div>
                                <span className={cn(
                                  'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                                  item.badge === 'Active'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : item.badge === 'Inactive'
                                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                )}>
                                  {item.badge}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Actions Section */}
                  {filteredActions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-1 mb-1">
                        {searchQuery.trim() === '' ? 'Quick Search & Actions' : 'Actions & Navigation'}
                      </p>
                      <div className="space-y-0.5">
                        {combinedResults
                          .filter(r => r.type === 'action')
                          .map((item) => {
                            const actualIndex = combinedResults.indexOf(item);
                            const isActive = actualIndex === selectedIndex;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setSelectedIndex(actualIndex)}
                                className={cn(
                                  'flex items-center justify-between w-full px-3 py-2 rounded-xl text-left transition-all cursor-pointer',
                                  isActive
                                    ? 'bg-primary/10 text-foreground border-l-2 border-primary'
                                    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                                    {(item as any).icon}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                                  </div>
                                </div>
                                {isActive && (
                                  <CornerDownLeft className="w-3.5 h-3.5 text-primary flex-shrink-0 mr-1 animate-pulse" />
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer keyboard help */}
            <div className="px-4 py-2 border-t border-border bg-muted/10 flex items-center justify-between text-[10px] text-muted-foreground select-none">
              <div className="flex items-center gap-2">
                <span>↑↓ to navigate</span>
                <span>·</span>
                <span>↵ to select</span>
              </div>
              <div>
                <span>esc to close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
