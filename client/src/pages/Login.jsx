import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { House, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui';

const DEMO = {
  owner: { email: 'owner@sunrise.example.com', password: 'owner123' },
  super: { email: 'admin@hostelhub.app', password: 'SuperAdmin@123' }
};

export default function Login() {
  const { login, adminLogin, isSuperAdmin } = useAuth();
  const { dark, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Email and password are required');
    setLoading(true);
    try {
      const user = mode === 'super' ? await adminLogin({ email, password }) : await login({ email, password });
      const target = mode === 'super' || isSuperAdmin ? '/admin/dashboard' : user.role === 'student' ? '/portal' : '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const fill = (k) => {
    setMode(k);
    setEmail(DEMO[k].email);
    setPassword(DEMO[k].password);
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-800 p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <House size={22} />
          </div>
          <span className="text-lg font-extrabold tracking-tight">HostelHub</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold leading-tight">
            Manage your hostel
            <br />
            from one dashboard.
          </h1>
          <p className="max-w-md text-sm text-white/80">
            Students, rooms, billing, food, attendance, payroll and reports — for hostels of any
            size, with a student portal and a SaaS super-admin console.
          </p>
          <ul className="space-y-2 text-sm text-white/80">
            <li>• Multi-tenant — every hostel sees only its own data</li>
            <li>• Role-based access for owners, managers, wardens &amp; staff</li>
            <li>• Automatic monthly invoicing with late fees</li>
          </ul>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} HostelHub · SaaS for hostels</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <button
          onClick={toggle}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <House size={22} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">HostelHub</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to continue to your hostel workspace.</p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('staff')}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                mode === 'staff'
                  ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              Owner / Staff
            </button>
            <button
              type="button"
              onClick={() => setMode('super')}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                mode === 'super'
                  ? 'border-fuchsia-600 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={14} /> Super Admin
              </span>
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hostel.com"
                  className="input pl-9"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-9 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-600 hover:underline"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner size={16} /> : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Demo accounts</p>
            <div className="flex gap-2">
              <button onClick={() => fill('owner')} className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                Owner
              </button>
              <button onClick={() => fill('super')} className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                Super Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}