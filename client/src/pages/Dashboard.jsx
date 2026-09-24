import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  AlertCircle, BedDouble, Building2, CalendarDays, CreditCard, Megaphone, TrendingDown, TrendingUp, Users, Wallet
} from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { Badge, Card } from '../components/ui';
import { Spinner } from '../components/ui';

const currencies = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

const StatCard = ({ icon: Icon, label, value, sub, tone = 'brand', onClick }) => {
  const tones = {
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    red: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
  };
  return (
    <button onClick={onClick} className={`card p-4 text-left transition hover:shadow-md ${onClick ? 'cursor-pointer' : 'cursor-default'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
    </button>
  );
};

export default function Dashboard() {
  usePageTitle('Dashboard');
  const [range, setRange] = useState('year');
  const { data, loading, error } = useApiData(() => api.get('/dashboard').then((r) => r.data?.data), []);
  const { data: trend, loading: trendLoading } = useApiData(
    () => api.get('/dashboard/trend', { params: { range } }).then((r) => r.data?.data),
    [range]
  );
  const { data: activity } = useApiData(() => api.get('/dashboard/recent-activity', { params: { limit: 8 } }).then((r) => r.data?.data), []);
  const { data: notices } = useApiData(() => api.get('/notices', { params: { limit: 5 } }).then((r) => r.data?.data?.data || []), []);
  const { data: pendingInvoices } = useApiData(() => api.get('/billing/invoices', { params: { status: 'open', limit: 6 } }).then((r) => r.data?.data?.data || []), []);
  const { data: rooms } = useApiData(() => api.get('/rooms', { params: { limit: 100 } }).then((r) => r.data?.data?.data || []), []);

  const s = data?.stats || {};
  const occupancy = [
    { name: 'Occupied', value: s.occupiedBeds || 0, color: '#4f46e5' },
    { name: 'Available', value: s.availableBeds || 0, color: '#10b981' },
    { name: 'Maintenance', value: s.maintenanceBeds || 0, color: '#f59e0b' }
  ];

  const roomStatus = (rooms || []).reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {}
  );

  const activityIcon = {
    student: Users,
    payment: Wallet,
    expense: TrendingDown,
    complaint: AlertCircle,
    visitor: CalendarDays
  };

  return (
    <div className="space-y-5">
      {error ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </Card>
      ) : null}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={28} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard icon={Users} label="Active Students" value={s.activeStudents} sub={`${s.totalStudents || 0} registered`} onClick={() => (window.location.href = '/students')} />
            <StatCard icon={BedDouble} label="Occupancy" value={`${s.occupancyPercent || 0}%`} sub={`${s.occupiedBeds || 0} / ${s.totalBeds || 0} beds`} tone="blue" onClick={() => (window.location.href = '/rooms')} />
            <StatCard icon={Wallet} label="Collected (month)" value={currencies(s.monthlyRentCollected)} sub={`Net ${currencies(s.netIncome)}`} tone="green" onClick={() => (window.location.href = '/billing/payments')} />
            <StatCard icon={AlertCircle} label="Pending Receipts" value={s.pendingInvoicesCount || 0} sub={currencies(s.pendingPayments)} tone="amber" onClick={() => (window.location.href = '/billing/invoices')} />
            <StatCard icon={TrendingDown} label="Expenses (month)" value={currencies(s.monthlyExpenses)} tone="red" onClick={() => (window.location.href = '/expenses')} />
            <StatCard icon={Building2} label="Rooms" value={s.totalRooms || 0} sub={`${s.totalBeds || 0} beds total`} onClick={() => (window.location.href = '/rooms')} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="card-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Revenue vs Expenses</h3>
                  <p className="text-xs text-slate-400">{range === 'year' ? 'Last 12 months' : 'Daily'}</p>
                </div>
                <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                  {['month', 'year'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                        range === r ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64 p-3">
                {trendLoading ? (
                  <div className="flex h-full items-center justify-center text-brand-600"><Spinner size={24} /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend || []} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" />
                      <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" />
                      <Tooltip
                        formatter={(v) => currencies(v)}
                        contentStyle={{ borderRadius: 12, fontSize: 12, background: 'var(--tw-bg-opacity, #fff)' }}
                        labelStyle={{ fontWeight: 700 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#4f46e5" strokeWidth={2} fill="url(#rev)" />
                      <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#exp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <div className="card-header">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Occupancy</h3>
                  <span className="text-xs font-semibold text-brand-600">{s.occupancyPercent || 0}%</span>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {occupancy.map((o) => (
                      <div key={o.name}>
                        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />
                            {o.name}
                          </span>
                          <span>{o.value}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${s.totalBeds ? Math.round((o.value / s.totalBeds) * 100) : 0}%`, background: o.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                      <span>Rooms by status</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {Object.entries(roomStatus).map(([k, v]) => (
                        <Badge key={k} tone={k === 'full' ? 'red' : k === 'available' ? 'green' : k === 'partial' ? 'amber' : 'blue'}>
                          {k}: {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="card-header">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <CreditCard size={14} className="text-amber-500" /> Due Soon
                  </h3>
                  <Link to="/billing/invoices" className="text-xs font-semibold text-brand-600 hover:underline">All</Link>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(pendingInvoices || []).length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400">Nothing due right now 🎉</p>
                  ) : null}
                  {(pendingInvoices || []).slice(0, 4).map((inv) => (
                    <div key={inv._id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{inv.studentName}</p>
                        <p className="text-[10px] text-slate-400">{inv.invoiceNumber} · due {new Date(inv.dueDate).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs font-bold text-rose-600">{currencies(inv.balance)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <div className="card-header">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  <Megaphone size={14} className="text-brand-500" /> Notices
                </h3>
                <Link to="/notices" className="text-xs font-semibold text-brand-600 hover:underline">Manage</Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(notices || []).length === 0 ? <p className="p-4 text-center text-xs text-slate-400">No notices yet</p> : null}
                {(notices || []).map((n) => (
                  <div key={n._id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                      <Badge tone={n.priority === 'high' ? 'red' : n.priority === 'medium' ? 'amber' : 'slate'}>{n.priority}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.description}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <div className="card-header">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  <TrendingUp size={14} className="text-emerald-500" /> Recent Activity
                </h3>
              </div>
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800/60">
                {(activity || []).length === 0 ? <p className="p-4 text-center text-xs text-slate-400">No activity yet</p> : null}
                {(activity || []).map((ev, i) => {
                  const Icon = activityIcon[ev.type] || Users;
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">{ev.text}</p>
                        <p className="text-[10px] text-slate-400">{new Date(ev.at).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}