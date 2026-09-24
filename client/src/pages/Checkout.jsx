import React, { useState } from 'react';
import { LogOut, UserRoundCheck } from 'lucide-react';
import api, { apiPost, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Spinner } from '../components/ui';
import { formatDate, formatMoney } from '../utils/format';

const CheckoutPreview = ({ student, preview, submitting, onSubmit, onCancel }) => {
  const toast = useToast();
  const [damageDeduction, setDamageDeduction] = useState('');
  const [otherDeduction, setOtherDeduction] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const damage = Number(damageDeduction) || 0;
  const other = Number(otherDeduction) || 0;
  const refundable = Math.max(0, (preview?.securityDeposit || 0) - damage - other - (preview?.outstandingBalance || 0));

  const confirm = () => {
    if (damage + other > (preview?.securityDeposit || 0)) {
      toast.error('Deductions exceed the security deposit');
      return;
    }
    onSubmit({
      studentId: student._id,
      damageDeduction: damage,
      otherDeduction: other,
      reason,
      notes
    });
  };

  return (
    <Modal open onClose={onCancel} title={`Checkout ${student.name}`} width="max-w-2xl" footer={
      <>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" loading={submitting} onClick={confirm} icon={LogOut}>Confirm checkout</Button>
      </>
    }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
            <p className="text-[11px] text-slate-400">Outstanding</p>
            <p className="font-bold text-rose-600">{formatMoney(preview?.outstandingBalance)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
            <p className="text-[11px] text-slate-400">Deposit</p>
            <p className="font-bold text-slate-800 dark:text-white">{formatMoney(preview?.securityDeposit)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
            <p className="text-[11px] text-slate-400">Deductions</p>
            <p className="font-bold text-amber-600">{formatMoney(preview?.totalDeductions)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
            <p className="text-[11px] text-slate-400">Refundable</p>
            <p className={`font-bold ${refundable > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{formatMoney(refundable)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Open invoices</p>
          {preview?.openInvoices?.length ? (
            <div className="space-y-1.5">
              {preview.openInvoices.map((i, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-slate-500">{i.invoiceNumber}</span>
                  <span className="text-slate-500">{formatDate(i.dueDate)}</span>
                  <span className={`font-semibold ${i.balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{formatMoney(i.balance)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No open invoices.</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Damage deduction (Rs.)" type="number" min="0" value={damageDeduction} onChange={(e) => setDamageDeduction(e.target.value)} />
          <Input label="Other deduction (Rs.)" type="number" min="0" value={otherDeduction} onChange={(e) => setOtherDeduction(e.target.value)} />
        </div>
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Course completed" />
        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
};

export default function Checkout() {
  usePageTitle('Checkout');
  const toast = useToast();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [student, setStudent] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: students, loading } = useApiData(
    () => api.get('/students', { params: { status: 'active', q: debouncedQ, limit: 50 } }).then((r) => r.data?.data?.data || []),
    [debouncedQ]
  );

  const onSearch = (e) => {
    setQ(e.target.value);
    clearTimeout(onSearch.t);
    onSearch.t = setTimeout(() => setDebouncedQ(e.target.value), 350);
  };

  const openPreview = async (s) => {
    setStudent(s);
    try {
      const res = await apiPost('/billing/checkout/preview', { studentId: s._id });
      setPreview(res.data?.data);
    } catch (err) {
      toast.error(errorMessage(err));
      setStudent(null);
    }
  };

  const confirmCheckout = async (payload) => {
    setSubmitting(true);
    try {
      const res = await apiPost('/billing/checkout', payload);
      toast.success(res.data?.message || 'Student checked out');
      setStudent(null);
      setPreview(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Checkout"
        subtitle="Release a bed and settle the student's balance"
        icon={LogOut}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search active student…" className="w-full sm:w-72" autoFocus />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !students.length ? (
          <EmptyState icon={UserRoundCheck} title="No active students" subtitle="Students in active status can be checked out." />
        ) : (
          <div className="divide-y divide-slate-200 px-3 dark:divide-slate-800">
            {students.map((s) => (
              <div key={s._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {s.name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {s.room?.roomNumber ? `Room ${s.room.roomNumber}${s.bedLabel ? `/${s.bedLabel}` : ''}` : 'No room'} · {formatDate(s.admissionDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${s.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {formatMoney(s.outstandingBalance)}
                  </span>
                  {s.status !== 'checkedout' ? <Badge tone="green">{s.status}</Badge> : <Badge>checkedout</Badge>}
                  <Button size="sm" variant="outline" icon={LogOut} onClick={() => openPreview(s)}>Checkout</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {student && !preview ? (
        <div className="mt-4 flex justify-center"><Spinner size={24} /></div>
      ) : null}

      {student && preview ? (
        <CheckoutPreview
          student={student}
          preview={preview}
          submitting={submitting}
          onSubmit={confirmCheckout}
          onCancel={() => {
            setStudent(null);
            setPreview(null);
          }}
        />
      ) : null}
    </div>
  );
}