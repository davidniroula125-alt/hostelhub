import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Banknote,
  BarChart3,
  BedDouble,
  Bell,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  FolderOpen,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Receipt,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  Sun,
  TrendingDown,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UtensilsCrossed,
  Wallet,
  Wrench,
  X,
  Zap,
  House,
  LogIn
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NAV_GROUPS, SUPERADMIN_NAV } from '../config/nav';
import api from '../api/client';
import { errorMessage } from '../api/client';

const ICONS = {
  LayoutDashboard,
  Users,
  BedDouble,
  UserPlus,
  CalendarCheck,
  CalendarDays,
  UserCheck,
  Receipt,
  Wallet,
  TrendingDown,
  LogOut,
  UtensilsCrossed,
  Zap,
  AlertCircle,
  Wrench,
  Boxes,
  Megaphone,
  IdCard,
  Banknote,
  FolderOpen,
  BarChart3,
  UserCog,
  Settings,
  ScrollText,
  CreditCard,
  GraduationCap,
  Building2,
  Sparkles
};

const roleLabel = (role) =>
  ({
    superadmin: 'Super Admin',
    owner: 'Owner',
    manager: 'Manager',
    accountant: 'Accountant',
    warden: 'Warden',
    staff: 'Staff',
    student: 'Student'
  }[role] || role);

const roleColor = (role) =>
  ({
    superadmin: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
    owner: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    accountant: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    warden: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    staff: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    student: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
  }[role] || 'bg-slate-100 text-slate-700');

const NavItem = ({ item, onNavigate }) => {
  const Icon = ICONS[item.icon] || Settings;
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
          isActive
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
        }`
      }
    >
      <Icon size={17} className="shrink-0" />
      {item.label}
    </NavLink>
  );
};

const SidebarContent = ({ user, onNavigate, isOpen, onClose }) => {
  const { isSuperAdmin } = useAuth();
  const groups = isSuperAdmin ? SUPERADMIN_NAV : NAV_GROUPS;
  const visible = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => (isSuperAdmin ? true : !i.roles || i.roles.includes(user?.role)))
    }))
    .filter((g) => g.items.length);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <House size={19} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">HostelHub</p>
          <p className="text-[10px] font-medium text-slate-400">{isSuperAdmin ? 'SaaS Console' : user?.hostelName || 'Hostel Management'}</p>
        </div>
        {isOpen ? (
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close menu">
            <X size={18} />
          </button>
        ) : null}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {visible.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.path} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      {!isSuperAdmin ? (
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <NavLink
            to="/subscription"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Sparkles size={16} className="text-brand-500" />
            Subscription
          </NavLink>
        </div>
      ) : null}
    </div>
  );
};

const NotificationsPanel = ({ onClose }) => {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/notifications/mine', { params: { limit: 20 } });
        setList(res.data?.data || []);
      } catch (e) {
        setErr(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all');
      setList((l) => l.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-40 sm:absolute sm:inset-auto sm:right-0 sm:top-14 sm:w-96">
      <div className="absolute inset-0 bg-slate-900/40 sm:hidden" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 top-14 mx-auto max-h-[75vh] overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:inset-auto sm:max-h-[70vh] sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Notifications</p>
          <button onClick={markAll} className="text-xs font-semibold text-brand-600 hover:underline">
            Mark all read
          </button>
        </div>
        <div className="max-h-[calc(70vh-52px)] overflow-y-auto">
          {loading ? <p className="p-6 text-center text-sm text-slate-400">Loading…</p> : null}
          {err ? <p className="p-6 text-center text-sm text-rose-500">{err}</p> : null}
          {!loading && !list.length ? <p className="p-6 text-center text-sm text-slate-400">No notifications yet</p> : null}
          {list.map((n) => (
            <div key={n._id} className={`border-b border-slate-100 px-4 py-3 dark:border-slate-800/60 ${n.read ? '' : 'bg-brand-50/60 dark:bg-brand-900/10'}`}>
              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
              <p className="mt-1 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ students: [], invoices: [], notices: [] });
  const navigate = useNavigate();

  useEffect(() => {
    if (!q.trim()) {
      setResults({ students: [], invoices: [], notices: [] });
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/search', { params: { q } });
        setResults(res.data?.data || {});
      } catch {
        setResults({ students: [], invoices: [], notices: [] });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (path) => {
    setOpen(false);
    setQ('');
    navigate(path);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-400 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
      >
        <Search size={15} />
        <span className="hidden sm:inline">Search…</span>
      </button>
      {open ? (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-16 w-[92%] max-w-xl -translate-x-1/2 rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <Search size={16} className="text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                placeholder="Search students, invoices, notices…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={15} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {!q.trim() ? <p className="p-4 text-center text-xs text-slate-400">Type to search across your hostel.</p> : null}
              {results.students?.map((s) => (
                <button key={s._id} onClick={() => go(`/students/${s._id}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Users size={15} className="text-slate-400" />
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{s.room || s.bedLabel}</span>
                </button>
              ))}
              {results.invoices?.map((i) => (
                <button key={i._id} onClick={() => go(`/billing/invoices`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Receipt size={15} className="text-slate-400" />
                  <span className="text-sm font-medium">{i.invoiceNumber}</span>
                  <span className="ml-auto text-xs text-slate-400">{i.studentName}</span>
                </button>
              ))}
              {results.notices?.map((n) => (
                <button key={n._id} onClick={() => go('/notices')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Megaphone size={15} className="text-slate-400" />
                  <span className="text-sm font-medium">{n.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Topbar = ({ onMenu, title }) => {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'superadmin') return;
    const load = async () => {
      try {
        const res = await api.get('/notifications/mine', { params: { limit: 1 } });
        setUnread(res.data?.data?.filter?.((n) => !n.read).length || 0);
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user]);

  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <button onClick={onMenu} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800">
        <Menu size={20} />
      </button>
      <p className="hidden flex-1 truncate text-sm font-semibold text-slate-700 md:block dark:text-slate-200">{title}</p>
      <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
        {user?.role !== 'superadmin' ? <GlobalSearch /> : null}
        <button
          onClick={toggle}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {user?.role !== 'superadmin' ? (
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((o) => !o);
                setMenuOpen(false);
              }}
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unread ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              ) : null}
            </button>
            {notifOpen ? <NotificationsPanel onClose={() => setNotifOpen(false)} /> : null}
          </div>
        ) : null}
        <div className="relative">
          <button
            onClick={() => {
              setMenuOpen((o) => !o);
              setNotifOpen(false);
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${roleColor(user?.role)}`}
          >
            {initials}
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-11 z-40 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
                <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${roleColor(user?.role)}`}>
                  {roleLabel(user?.role)}
                </span>
              </div>
              {user?.role === 'student' ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.href = '/portal';
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <GraduationCap size={15} /> My Portal
                </button>
              ) : null}
              {user?.role !== 'superadmin' ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.href = '/settings';
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Settings size={15} /> Settings
                </button>
              ) : null}
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

const TitleContext = createContext(null);

export const usePageTitle = (title) => {
  const ctx = useContext(TitleContext);
  useEffect(() => {
    ctx?.setTitle?.(title || '');
    if (title) document.title = `${title} · HostelHub`;
  }, [title, ctx]);
};

export default function Layout({ children }) {
  const { user, token } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!token) return <Navigate to="/login" replace />;

  const titleApi = useMemo(() => ({ title, setTitle }), [title]);

  return (
    <TitleContext.Provider value={titleApi}>
      <div className="flex h-full">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent
            user={user}
            onNavigate={() => setSidebarOpen(false)}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>
        {sidebarOpen ? (
          <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setSidebarOpen(true)} title={title} />
          <main className="min-w-0 flex-1 overflow-x-hidden">
            <div className="p-4 md:p-6">{children}</div>
          </main>
        </div>
      </div>
    </TitleContext.Provider>
  );
}