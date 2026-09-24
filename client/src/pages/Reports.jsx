import React, { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  AlertCircle, BarChart3, BedDouble, CalendarCheck, Download, Receipt, TrendingDown, TrendingUp, Wallet
} from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Spinner } from '../components/ui';
import { downloadCsv, formatDate, formatMoney } from '../utils/format';

const TABS = [
  { key: 'financial', label: 'Financial', icon: Wallet },
  { key: 'occupancy', label: 'Occupancy', icon: BedDouble },
  { key: 'attendance', label: 'Attendance', icon: CalendarCheck }
];

const PIE_COLORS = { Occupied: '#4f46e5', Available: '#10b981', Reserved: '#f59e0b', Maintenance: '#f43f5e' };

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
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
};

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(new Blob([blob], { type: blob.type || 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function Reports() {
  usePageTitle('Reports');
  const toast = useToast();
  const [tab, setTab] = useState('financial');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, loading, error } = useApiData(
    () => api.get(`/reports/${tab}`, { params: { from, to } }).then((r) => r.data?.data),
    [tab, from, to]
  );

  const methodData = useMemo(
    () => Object.entries(data?.byMethod || {}).map(([name, amount]) => ({ name, amount })),
    [data]
  );

  const roomRows = useMemo(() => (Array.isArray(data) ? data.filter((r) => r.roomNumber !== 'TOTAL') : []), [data]);
  const totalRow = useMemo(() => (Array.isArray(data) ? data.find((r) => r.roomNumber === 'TOTAL') : null), [data]);
  const occupancyPie = useMemo(() => {
    if (!totalRow) return [];
    return [
      { name: 'Occupied', value: totalRow.occupied },
      { name: 'Available', value: totalRow.available },
      { name: 'Reserved', value: totalRow.reserved },
      { name: 'Maintenance', value: totalRow.maintenance }
    ].filter((o) => o.value > 0);
  }, [totalRow]);

  const attendanceRows = useMemo(() => (Array.isArray(data) ? [...data].sort((a, b) => b.total - a.total).slice(0, 10) : []), [data]);

  const downloadReport = async () => {
    try {
      if (tab === 'financial' && data?.summary) {
        downloadCsv('financial-report.csv', [
          { Metric: 'Revenue', Value: data.summary.revenue },
          { Metric: 'Expenses', Value: data.summary.expenses },
          { Metric: 'Net profit', Value: data.summary.netProfit },
          { Metric: 'Billed', Value: data.summary.billed },
          { Metric: 'Outstanding', Value: data.summary.outstanding },
          { Metric: 'Refunds', Value: data.summary.refunds },
          { Metric: 'Collections rate %', Value: data.summary.collectionsRate },
          { Metric: 'Payment count', Value: data.summary.paymentCount },
          { Metric: 'Expense count', Value: data.summary.expenseCount }
        ]);
      } else {
        const res = await api.get(`/reports/${tab}`, {
          params: { from, to, export: 'csv', filename: `${tab}-report` },
          responseType: 'blob'
        });
        saveBlob(res.data, `${tab}-report-${new Date().toISOString().slice(0, 10)}.csv`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        subtitle="Financial, occupancy and attendance insights"
        icon={BarChart3}
        actions={
          <Button variant="outline" icon={Download} onClick={downloadReport}>
            Download
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-3 dark:border-slate-800">
          <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  tab === key ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <span className="text-xs text-slate-400">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </Card>
      ) : null}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={28} /></div>
      ) : tab === 'financial' && data?.summary ? (
        <FinancialView data={data} methodData={methodData} />
      ) : tab === 'occupancy' ? (
        <OccupancyView rows={roomRows} total={totalRow} pie={occupancyPie} />
      ) : tab === 'attendance' ? (
        <AttendanceView rows={Array.isArray(data) ? data : []} chart={attendanceRows} />
      ) : (
        <EmptyState icon={AlertCircle} title="No data for this range" subtitle="Try a wider date range." />
      )}
    </div>
  );
}

const FinancialView = ({ data, methodData }) => {
  const s = data.summary;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={TrendingUp} label="Revenue" value={formatMoney(s.revenue)} sub={`${s.paymentCount} payments`} tone="green" />
        <StatCard icon={TrendingDown} label="Expenses" value={formatMoney(s.expenses)} sub={`${s.expenseCount} entries`} tone="red" />
        <StatCard icon={Wallet} label="Net profit" value={formatMoney(s.netProfit)} tone="indigo" />
        <StatCard icon={Receipt} label="Billed" value={formatMoney(s.billed)} tone="blue" />
        <StatCard icon={AlertCircle} label="Outstanding" value={formatMoney(s.outstanding)} tone="amber" />
        <StatCard icon={BarChart3} label="Collections rate" value={`${s.collectionsRate}%`} tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="card-header"><h3 className="text-sm font-bold">Revenue by method</h3></div>
          <div className="h-60 p-3">
            {!methodData.length ? (
              <EmptyState icon={Wallet} title="No payments in this range" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" />
                  <Tooltip
                    formatter={(v) => formatMoney(v)}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ fontWeight: 700 }}
                  />
                  <Bar dataKey="amount" name="Collected" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <div className="card-header"><h3 className="text-sm font-bold">Recent payments</h3></div>
          {!data.payments?.length ? <EmptyState icon={Wallet} title="No payments in this range" /> : (
            <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800/60">
              {data.payments.slice(0, 8).map((p) => (
                <div key={p._id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">{p.studentName}</p>
                    <p className="text-[10px] text-slate-400">{p.receiptNumber} · {formatDate(p.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-600">{formatMoney(p.amount)}</p>
                    <Badge tone="blue">{p.method}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const OccupancyView = ({ rows, total, pie }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard icon={BedDouble} label="Total beds" value={total?.total || 0} tone="blue" />
      <StatCard icon={BedDouble} label="Occupied" value={total?.occupied || 0} sub={`${total?.percent || 0}% fill`} tone="green" />
      <StatCard icon={BedDouble} label="Available" value={total?.available || 0} tone="brand" />
      <StatCard icon={BedDouble} label="Maintenance" value={total?.maintenance || 0} tone="red" />
    </div>

    <Card>
      <div className="card-header"><h3 className="text-sm font-bold">Bed occupancy</h3></div>
      <div className="h-64 p-3">
        {pie.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" outerRadius={90} innerRadius={48} paddingAngle={3} label={(e) => `${e.name} ${e.value}`}>
                {pie.map((entry) => <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#94a3b8'} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v} beds`} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={BedDouble} title="No rooms yet" />
        )}
      </div>
    </Card>

    <Card>
      <div className="card-header"><h3 className="text-sm font-bold">Rooms</h3></div>
      {!rows.length ? <EmptyState icon={BedDouble} title="No rooms yet" /> : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Room</th><th>Floor</th><th>Type</th><th className="text-right">Beds</th><th className="text-right">Occupied</th><th className="text-right">Available</th><th className="text-right">Reserved</th><th className="text-right">Maint.</th><th className="text-right">%</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.roomNumber}>
                  <td className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{r.roomNumber}</td>
                  <td>{r.floor}</td>
                  <td>{r.roomType}</td>
                  <td className="text-right">{r.total}</td>
                  <td className="text-right text-emerald-600">{r.occupied}</td>
                  <td className="text-right">{r.available}</td>
                  <td className="text-right">{r.reserved}</td>
                  <td className="text-right">{r.maintenance}</td>
                  <td className="text-right">
                    <Badge tone={r.percent === 100 ? 'red' : r.percent >= 50 ? 'amber' : 'green'}>{r.percent}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  </div>
);

const AttendanceView = ({ rows, chart }) => (
  <div className="space-y-4">
    <Card>
      <div className="card-header"><h3 className="text-sm font-bold">Attendance by student</h3></div>
      <div className="h-60 p-3">
        {!chart.length ? (
          <EmptyState icon={CalendarCheck} title="No attendance in this range" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
              <XAxis dataKey="student" tick={{ fontSize: 10 }} stroke="currentColor" className="text-slate-400" interval={0} angle={-18} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" name="Present" stackId="a" fill="#10b981" />
              <Bar dataKey="late" name="Late" stackId="a" fill="#f59e0b" />
              <Bar dataKey="absent" name="Absent" stackId="a" fill="#f43f5e" />
              <Bar dataKey="leave" name="Leave" stackId="a" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>

    <Card>
      <div className="card-header"><h3 className="text-sm font-bold">Detail</h3></div>
      {!rows.length ? <EmptyState icon={CalendarCheck} title="No attendance in this range" /> : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Student</th><th>Room</th><th className="text-right">Present</th><th className="text-right">Late</th><th className="text-right">Absent</th><th className="text-right">Leave</th><th className="text-right">%</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student}>
                  <td className="font-semibold text-slate-800 dark:text-slate-200">{r.student}</td>
                  <td>{r.room || '—'}</td>
                  <td className="text-right text-emerald-600">{r.present}</td>
                  <td className="text-right">{r.late}</td>
                  <td className="text-right text-rose-600">{r.absent}</td>
                  <td className="text-right">{r.leave}</td>
                  <td className="text-right"><Badge tone={r.percent >= 80 ? 'green' : r.percent >= 60 ? 'amber' : 'red'}>{r.percent}%</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  </div>
);