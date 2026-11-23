import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Check, House, Lock, Mail, Phone, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui';

const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,19}$/;

const PLANS = [
  { code: 'BASIC', name: 'Basic', price: 1000, blurb: 'Rooms, students, payments, invoices' },
  { code: 'STANDARD', name: 'Standard', price: 2000, blurb: 'Adds expenses, food, attendance, reports' },
  { code: 'PREMIUM', name: 'Premium', price: 4000, blurb: 'Multi-branch, payroll, analytics' }
];

export default function Register() {
  const { register } = useAuth();
  const { dark, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [hostelCode, setHostelCode] = useState('');
  const [check, setCheck] = useState('');
  const [hostelName, setHostelName] = useState('');
  const [hostelType, setHostelType] = useState('boys');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [planCode, setPlanCode] = useState('BASIC');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = hostelCode.trim().toUpperCase();
    if (!code) {
      setCheck('');
      return;
    }
    if (!CODE_RE.test(code)) {
      setCheck('invalid');
      return;
    }
    setCheck('checking');
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/auth/hostel-code/check', { params: { code } });
        setCheck(res.data?.data?.available ? 'available' : 'taken');
      } catch {
        setCheck('');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [hostelCode]);

  const submit = async (e) => {
    e.preventDefault();
    if (!hostelCode.trim() || !hostelName.trim() || !name.trim() || !email.trim() || !password) {
      return toast.error('Please fill all required fields');
    }
    if (check !== 'available') return toast.error('Choose an available Hostel ID');
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        hostelName: hostelName.trim(),
        hostelType,
        email: email.trim(),
        phone: phone.trim(),
        password,
        planCode,
        hostelCode: hostelCode.trim().toUpperCase()
      });
      toast.success('Hostel created! Enjoy your free trial.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const codeStatus = {
    checking: { text: 'Checking availability…', cls: 'text-slate-400' },
    available: { text: 'Hostel ID is available', cls: 'text-emerald-600 dark:text-emerald-400' },
    taken: { text: 'This Hostel ID is already taken', cls: 'text-rose-600 dark:text-rose-400' },
    invalid: { text: 'Use 3–20 chars: A–Z, 0–9, - and _', cls: 'text-amber-600 dark:text-amber-400' }
  }[check];

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
            Create your hostel's
            <br />
            own ID and workspace.
          </h1>
          <p className="max-w-md text-sm text-white/80">
            Pick a unique Hostel ID (like <span className="font-bold text-white">SUNRISE-BH</span>), invite
            your staff, and start managing rooms, students and billing in minutes.
          </p>
          <ul className="space-y-2 text-sm text-white/80">
            <li>• 14-day free trial — no card needed</li>
            <li>• Your data stays isolated to your hostel</li>
            <li>• Upgrade or cancel anytime</li>
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
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <House size={22} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">HostelHub</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create your hostel</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Start your 14-day free trial — choose your Hostel ID below.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Hostel ID</label>
              <div className="relative">
                <Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={hostelCode}
                  onChange={(e) => setHostelCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUNRISE-BH"
                  className={`input pl-9 uppercase ${
                    check === 'available'
                      ? 'border-emerald-400 focus:border-emerald-500'
                      : check === 'taken'
                        ? 'border-rose-400 focus:border-rose-500'
                        : ''
                  }`}
                  maxLength={20}
                  autoComplete="off"
                  required
                />
                {check === 'available' ? (
                  <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                ) : null}
                {check === 'taken' || check === 'invalid' ? (
                  <X size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500" />
                ) : null}
              </div>
              {codeStatus ? <p className={`mt-1.5 text-xs font-medium ${codeStatus.cls}`}>{codeStatus.text}</p> : (
                <p className="mt-1.5 text-xs text-slate-400">3–20 characters: A–Z, 0–9, - and _ · unique across HostelHub</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Hostel name</label>
                <input
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                  placeholder="Sunrise Boys Hostel"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Type</label>
                <select value={hostelType} onChange={(e) => setHostelType(e.target.value)} className="input">
                  <option value="boys">Boys</option>
                  <option value="girls">Girls</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Your name</label>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="input pl-9"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@hostel.com"
                    className="input pl-9"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <div className="relative">
                  <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="input pl-9"
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="input pl-9 pr-16"
                  autoComplete="new-password"
                  required
                  minLength={6}
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

            <div>
              <label className="label">Plan</label>
              <div className="space-y-2">
                {PLANS.map((p) => (
                  <label
                    key={p.code}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                      planCode === p.code
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={p.code}
                      checked={planCode === p.code}
                      onChange={() => setPlanCode(p.code)}
                      className="accent-brand-600"
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {p.name} <span className="font-normal text-slate-400">· {p.blurb}</span>
                      </span>
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Rs. {p.price.toLocaleString()}
                      <span className="text-xs font-medium text-slate-400">/mo</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || check !== 'available'} className="btn-primary w-full">
              {loading ? <Spinner size={16} /> : 'Create hostel'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
