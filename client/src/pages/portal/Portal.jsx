import React from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble, CalendarDays, ChevronRight, GraduationCap, Megaphone, Receipt, UtensilsCrossed, Wallet
} from 'lucide-react';
import api, { fileUrl } from '../../api/client';
import { usePageTitle } from '../../components/Layout';
import { useApiData } from '../../hooks/useApi';
import { Badge, Card, EmptyState, PageHeader, Spinner } from '../../components/ui';
import { formatDate, formatMoney } from '../../utils/format';

const INV_TONE = { open: 'amber', partial: 'blue', paid: 'green', draft: 'slate', void: 'slate' };

export default function Portal() {
  usePageTitle('My Portal');
  const { data, loading } = useApiData(() => api.get('/student/dashboard').then((r) => r.data?.data), []);

  if (loading) return <div className="flex h-64 items-center justify-center text-brand-600"><Spinner size={28} /></div>;

  const s = data?.student;
  const dueInvoices = (data?.invoices || []).filter((i) => ['open', 'partial'].includes(i.status));
  const hostel = data?.hostel;

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Portal"
        subtitle={hostel ? `${hostel.name}${hostel.address ? ` · ${hostel.address}` : ''}` : 'Student dashboard'}
        icon={GraduationCap}
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {s?.photo ? (
            <img src={fileUrl(s.photo)} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-xl font-extrabold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {s?.name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{s?.name}</h2>
              {s?.studentId ? <Badge tone="indigo">{s.studentId}</Badge> : null}
              <Badge tone={s?.status === 'active' ? 'green' : 'amber'}>{s?.status}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><BedDouble size={13} /> Room {s?.room?.roomNumber || '—'}{s?.bedLabel ? ` · ${s.bedLabel}` : ''}</span>
              <span className="flex items-center gap-1"><UtensilsCrossed size={13} /> {s?.foodPlan?.name || 'No food plan'}</span>
              {s?.college ? <span>{s.college}</span> : null}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-400">Monthly Rent</p>
          <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{formatMoney(s?.monthlyRent ?? data?.monthlyRent)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-400">Outstanding</p>
          <p className={`mt-1 text-base font-extrabold ${(data?.outstandingBalance ?? s?.outstandingBalance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatMoney(data?.outstandingBalance ?? s?.outstandingBalance)}
          </p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-400">Due Invoices</p>
          <p className="mt-1 text-base font-extrabold text-amber-600">{dueInvoices.length}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-400">Notices</p>
          <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{data?.notices?.length || 0}</p>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/portal/invoices" className="card group flex items-center gap-3 p-4 transition hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            <Receipt size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">My Invoices</p>
            <p className="text-xs text-slate-400">View bills, payments and pay due amounts</p>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-500" />
        </Link>
        <Link to="/portal/leaves" className="card group flex items-center gap-3 p-4 transition hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CalendarDays size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Request Leave</p>
            <p className="text-xs text-slate-400">Submit and track your leave requests</p>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-500" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="card-header">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white"><Wallet size={14} className="text-amber-500" /> Due Invoices</h3>
            <Link to="/portal/invoices" className="text-xs font-semibold text-brand-600 hover:underline">All invoices</Link>
          </div>
          {!dueInvoices.length ? <EmptyState icon={Receipt} title="Nothing due right now" /> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {dueInvoices.map((inv) => (
                <div key={inv._id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{inv.invoiceNumber}</p>
                    <p className="text-[11px] text-slate-400">{inv.period || ''}{inv.dueDate ? ` · due ${formatDate(inv.dueDate)}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-rose-600">{formatMoney(inv.balance)}</p>
                    <Badge tone={INV_TONE[inv.status] || 'slate'}>{inv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="card-header">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white"><Megaphone size={14} className="text-brand-500" /> Latest Notices</h3>
          </div>
          {!data?.notices?.length ? <EmptyState icon={Megaphone} title="No notices yet" /> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {data.notices.map((n) => (
                <div key={n._id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                    <Badge tone={n.priority === 'high' || n.priority === 'urgent' ? 'red' : n.priority === 'medium' ? 'amber' : 'slate'}>{n.priority}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.description}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{formatDate(n.publishDate)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}