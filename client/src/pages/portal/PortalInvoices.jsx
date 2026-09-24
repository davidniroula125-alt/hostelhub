import React, { useState } from 'react';
import { ArrowLeft, BadgeCheck, Receipt } from 'lucide-react';
import api from '../../api/client';
import { usePageTitle } from '../../components/Layout';
import { useApiData } from '../../hooks/useApi';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Spinner } from '../../components/ui';
import { formatDate, formatMoney } from '../../utils/format';

const INV_TONE = { open: 'amber', partial: 'blue', paid: 'green', draft: 'slate', void: 'slate' };

export default function PortalInvoices() {
  usePageTitle('My Invoices');
  const [payInfo, setPayInfo] = useState(null);

  const { data: profile } = useApiData(() => api.get('/student/dashboard').then((r) => r.data?.data), []);
  const { data: invoices, loading, refetch } = useApiData(() => api.get('/student/invoices').then((r) => r.data?.data), []);

  const student = profile?.student;
  const list = invoices || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/portal')}>
          <ArrowLeft size={15} /> Portal
        </Button>
      </div>

      <PageHeader
        title="My Invoices"
        subtitle={`${list.length} invoice${list.length === 1 ? '' : 's'} · outstanding ${formatMoney(student?.outstandingBalance)}`}
        icon={Receipt}
      />

      {loading ? (
        <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={28} /></div>
      ) : !list.length ? (
        <EmptyState icon={Receipt} title="No invoices yet" subtitle="Your invoices will appear here once generated." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((inv) => (
            <Card key={inv._id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-4 dark:border-slate-800/60">
                <div>
                  <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{inv.invoiceNumber}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {inv.period || formatDate(inv.invoiceDate)}
                    {inv.dueDate ? ` · due ${formatDate(inv.dueDate)}` : ''}
                  </p>
                </div>
                <Badge tone={INV_TONE[inv.status] || 'slate'}>{inv.status}</Badge>
              </div>

              <div className="flex-1 divide-y divide-slate-100 px-4 py-2 dark:divide-slate-800/60">
                {!inv.items?.length ? (
                  <p className="py-3 text-xs text-slate-400">No line items</p>
                ) : (
                  inv.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">{it.description}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatMoney(it.amount * (it.qty || 1))}
                        {it.qty > 1 ? ` ×${it.qty}` : ''}
                      </span>
                    </div>
                  ))
                )}
                {inv.lateFee > 0 ? (
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">Late fee</span>
                    <span className="font-semibold text-rose-600">{formatMoney(inv.lateFee)}</span>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-slate-100 p-4 text-center dark:border-slate-800/60">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">{formatMoney(inv.total)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Paid</p>
                  <p className="text-sm font-extrabold text-emerald-600">{formatMoney(inv.paid)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Balance</p>
                  <p className={`text-sm font-extrabold ${inv.balance > 0 ? 'text-rose-600' : 'text-slate-600 dark:text-slate-300'}`}>{formatMoney(inv.balance)}</p>
                </div>
              </div>

              {inv.balance > 0 && ['open', 'partial'].includes(inv.status) && student ? (
                <div className="px-4 pb-4">
                  <Button className="w-full" variant="outline" icon={BadgeCheck} onClick={() => setPayInfo(inv)}>
                    How to pay
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!payInfo} onClose={() => setPayInfo(null)} title={`Paying ${payInfo?.invoiceNumber}`} width="max-w-sm">
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>Payments are collected at the hostel front desk (cash, bank transfer, eSewa or Khalti).</p>
          <p>Ask the accountant or warden to record the payment against <strong>{payInfo?.invoiceNumber}</strong> (balance {formatMoney(payInfo?.balance)}). It will reflect here shortly after.</p>
          <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Online payments are coming soon.
          </div>
        </div>
      </Modal>
    </div>
  );
}