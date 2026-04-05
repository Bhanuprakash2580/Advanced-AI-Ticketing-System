import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { apiGet } from '../api';
import { useRealtime } from '../hooks/useRealtime';

/* ── Inline SVG icons ── */
function IconPlus() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconQueue() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 8h8M8 12h5M8 16h3" />
    </svg>
  );
}
function IconPeople() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 21v-1.5a3 3 0 00-2.5-2.96" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="6" width="4" height="15" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
function IconAI() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="lg-nav-vibrant" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#lg-nav-vibrant)" />
      <path d="M9 12h14M9 16h10M9 20h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="23" cy="10" r="3.5" fill="#34d399" />
      <path d="M21.5 10l1 1 2-2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type NavItem = {
  to: string;
  end?: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export function Layout() {
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadUnread = useCallback(() => {
    apiGet<{ id: string; read_at: string | null }[]>('/api/notifications')
      .then((rows) => setUnread(rows.filter((n) => !n.read_at).length))
      .catch(() => {});
  }, []);

  useEffect(() => { loadUnread(); }, [loadUnread]);
  useRealtime(loadUnread);

  const navItems: NavItem[] = [
    { to: '/', end: true, label: 'New Ticket', icon: <IconPlus /> },
    { to: '/tickets', label: 'Queue', icon: <IconQueue /> },
    { to: '/employees', label: 'Directory', icon: <IconPeople /> },
    { to: '/analytics', label: 'Analytics', icon: <IconChart /> },
    { to: '/notifications', label: 'Inbox', icon: <IconBell />, badge: unread },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#fdfdff]">
      {/* ── Top Navigation Bar: Premium Gradient ── */}
      <header className="sticky top-0 z-50 h-[var(--nav-h)] border-b border-indigo-500/10 bg-gradient-to-r from-slate-900 via-[#1e1b4b] to-slate-900 shadow-xl shadow-indigo-900/10">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo / Brand & Workspace */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 outline-none group border-r border-white/10 pr-6">
              <IconAI />
              <div className="hidden xs:block">
                <h1 className="text-sm font-bold leading-tight text-white tracking-tight group-hover:text-indigo-200 transition-colors">AI Ticketing</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Internal Ops</p>
              </div>
            </Link>
            <div className="hidden lg:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/60">Workspace</p>
              <h2 className="text-xs font-bold text-slate-200">Operations Desk</h2>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden h-full items-center md:flex" aria-label="Desktop Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'relative flex h-full items-center gap-2.5 px-5 text-[13px] font-semibold tracking-wide transition-all outline-none',
                    isActive
                      ? 'text-white'
                      : 'text-indigo-200/60 hover:text-white hover:bg-white/5',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`shrink-0 transition-colors ${isActive ? 'text-indigo-300' : 'text-indigo-400/50'}`}>
                      {item.icon}
                    </span>
                    <span className="hidden sm:inline">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="ml-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[0.6rem] font-bold text-white shadow-sm ring-1 ring-white/20">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-gradient-to-r from-indigo-400 to-purple-400 shadow-[0_-2px_8px_rgba(129,140,248,0.5)]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Live Indicator */}
            <div className="hidden xs:flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200/80">Engine Live</span>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white hover:bg-white/5 md:hidden"
              aria-label="Toggle navigation"
            >
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                {mobileOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Nav Overlay ── */}
      {mobileOpen && (
        <div className="sticky top-[var(--nav-h)] z-40 border-b border-slate-800 bg-slate-900 md:hidden anim-slide-down">
          <nav className="flex flex-col p-2" onClick={() => setMobileOpen(false)}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-4 py-3.5 text-sm font-semibold transition-all',
                    isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-white/5 hover:text-white',
                  ].join(' ')
                }
              >
                <span className="text-indigo-500/50">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="ml-auto rounded-full bg-indigo-500 px-2 py-0.5 text-[0.625rem] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 anim-fade-in">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-slate-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <IconAI />
              <div>
                <span className="block text-xs font-bold text-slate-900 tracking-tight">Advanced AI Ticketing</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 md:items-end">
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
