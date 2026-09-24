import React, { useCallback, useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  Ban, Building2, CheckCircle2, Clock, CreditCard, RefreshCw, TrendingUp, UserCog, Users, Wallet
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { usePageTitle } from '../../components/Layout';
import { useApiData } from '../../hooks/useApi';
import { Badge, Button, Card, PageHeader, Spinner } from '../../components/ui';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';

const StatCard = ({ icon: Icon, label, value, sub, tone = 'brand' }) => {
  const tones = {
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    red: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
    </Card>
  );
};

const STATUS_TONE = { trial: 'amber', active: 'green', suspended: 'red', cancelled: 'slate', expired: 'slate' };
const PAY_TONE = { completed: 'green', refunded: 'amber', void: 'slate' };

export default function AdminDashboard() {
  usePageTitle('Admin Dashboard');
  const fetcher = useCallback(() => api.get('/admin/dashboard').then((r) => r.data?.data), []);
  const { data, loading, error, refetch } = useApiData(fetcher, []);
  const s = data?.stats || {};

  const planBreakdown = useMemo(() => {
    const counts = {};
    (data?.subscriptions || []).forEach((sub) => {
      const key = sub.plan?.name || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [data]);

  if (loading && !data) return <div className="flex h-64 items-center justify-center text-brand-600"><Spinner size={28} /></div>;

  if (error && !data) {
    return (
      <Card className="flex flex-col items-start gap-3 border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/40">
        <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        <Button variant="outline" icon={RefreshCw} onClick={refetch}>Retry</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform Overview"
        subtitle="Hostels, subscriptions and revenue across HostelHub"
        icon={Building2}
        actions={<Button variant="outline" icon={RefreshCw} loading={loading} onClick={refetch}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Building2} label="Total Hostels" value={s.totalHostels || 0} sub={`${s.activeHostels || 0} active`} />
        <StatCard icon={CheckCircle2} label="Active" value={s.activeHostels || 0} sub={`${s.trialHostels || 0} on trial`} tone="green" />
        <StatCard icon={Ban} label="Suspended" value={s.suspendedHostels || 0} tone="red" />
        <StatCard icon={UserCog} label="Users" value={s.totalUsers || 0} tone="blue" />
        <StatCard icon={Users} label="Students" value={s.totalStudents || 0} tone="indigo" />
        <StatCard icon={CreditCard} label="Subscriptions" value={s.subscriptionCount || 0} tone="blue" />
        <StatCard icon={Wallet} label="Total Revenue" value={formatMoney(s.totalRevenue)} tone="green" />
        <StatCard icon={TrendingUp} label="Monthly MRR" value={formatMoney(s.monthlyRecurringRevenue)} />
        <StatCard icon={Clock} label="Trial Hostels" value={s.trialHostels || 0} sub="Awaiting activation" tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="card-header">
            <h3 className="text-sm font-bold">Subscriptions by plan</h3>
            <span className="text-xs text-slate-400">All plans</span>
          </div>
          <div className="h-64 p-3">
            {planBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planBreakdown} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12, background: '#fff' }}
                    labelStyle={{ fontWeight: 700 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" name="Subscriptions" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">No subscription data yet</p>
            )}
          </div>
        </Card>
        <Card>
          <div className="card-header">
            <h3 className="text-sm font-bold">Status overview</h3>
          </div>
          <div className="space-y-3 p-4">
            {[
              { label: 'Active hostels', value: s.activeHostels || 0, tone: 'green' },
              { label: 'Trial hostels', value: s.trialHostels || 0, tone: 'amber' },
              { label: 'Suspended hostels', value: s.suspendedHostels || 0, tone: 'red' },
              { label: 'Total plans', value: data?.plans?.length || 0, tone: 'blue' }
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{row.label}</span>
                <Badge tone={row.tone}>{row.value}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="card-header">
          <h3 className="text-sm font-bold">Recent hostels</h3>
          <Link to="/admin/hostels" className="text-xs font-semibold text-brand-600 hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Hostel</th>
                <th>Type</th>
                <th>Plan</th>
                <th className="text-right">Students</th>
                <th>Trial ends</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentHostels || []).map(({ hostel, studentCount, subscription }) => (
                <tr key={hostel._id}>
                  <td>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{hostel.name}</p>
                    <p className="text-[11px] text-slate-400">{hostel.email || ''}</p>
                  </td>
                  <td><Badge tone="indigo">{hostel.type}</Badge></td>
                  <td className="text-slate-600 dark:text-slate-300">{subscription?.plan?.name || hostel.plan?.name || '—'}</td>
                  <td className="text-right text-slate-600 dark:text-slate-300">{studentCount}</td>
                  <td className="text-slate-500">{formatDate(hostel.trialEndsAt)}</td>
                  <td><Badge tone={STATUS_TONE[hostel.status] || 'slate'}>{hostel.status}</Badge></td>
                </tr>
              ))}
              {!(data?.recentHostels || []).length ? (
                <tr><td colSpan={6} className="py-6 text-center text-sm text-slate-400">No hostels yet</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="card-header">
          <h3 className="text-sm font-bold">Recent payments</h3>
          <Link to="/admin/payments" className="text-xs font-semibold text-brand-600 hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Student</th>
                <th>Hostel</th>
                <th>Date</th>
                <th>Method</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.payments || []).map((p) => (
                <tr key={p._id}>
                  <td className="font-mono text-xs text-slate-500">{p.receiptNumber || '—'}</td>
                  <td className="font-semibold text-slate-800 dark:text-slate-200">{p.student?.name || p.studentName || '—'}</td>
                  <td className="text-slate-600 dark:text-slate-300">{p.hostel?.name || '—'}</td>
                  <td className="text-slate-500">{formatDateTime(p.date)}</td>
                  <td><Badge tone="blue">{p.method}</Badge></td>
                  <td className="text-right font-semibold text-emerald-600">{formatMoney(p.amount)}</td>
                  <td><Badge tone={PAY_TONE[p.status] || 'slate'}>{p.status}</Badge></td>
                </tr>
              ))}
              {!(data?.payments || []).length ? (
                <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-400">No payments yet</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}