import React, { useMemo, useState } from 'react';
import { CalendarClock, Eye, Plus, Receipt, Trash2, Wallet } from 'lucide-react';
import api, { apiPost, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import PaymentModal from '../components/PaymentModal';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../components/ui';
import { formatDate, formatMoney } from '../utils/format';

const STATUS_TONE = {
  open: 'red',
  partial: 'amber',
  paid: 'green',
  draft: 'slate',
  void: 'slate'
};

const LINE_TYPES = ['rent', 'food', 'utility', 'other'];

const CreateInvoiceForm = ({ onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [period, setPeriod] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState('');
  const [lateFee, setLateFee] = useState('');
  const [additionalCharges, setAdditionalCharges] = useState('');
  const [items, setItems] = useState([{ description: '', type: 'rent', amount: '' }]);

  const { data: students } = useApiData(
    () => api.get('/students', { params: { status: 'active', limit: 200 } }).then((r) => r.data?.data?.data || []),
    []
  );

  const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const total = subtotal - (Number(discount) || 0) + (Number(additionalCharges) || 0) + (Number(lateFee) || 0);

  const setItem = (i, k) => (e) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [k]: e.target.value } : it)));

  const submit = async (e) => {
    e.preventDefault();
    if (!studentId) return toast.error('Select a student');
    if (!items.some((it) => it.description.trim() && Number(it.amount) > 0)) return toast.error('Add at least one item');
    setBusy(true);
    try {
      await apiPost('/billing/invoices', {
        studentId,
        period: period || undefined,
        invoiceDate: invoiceDate || undefined,
        dueDate: dueDate || undefined,
        discount: discount !== '' ? Number(discount) : 0,
        lateFee: lateFee !== '' ? Number(lateFee) : 0,
        additionalCharges: additionalCharges !== '' ? Number(additionalCharges) : 0,
        items: items.filter((it) => it.description.trim()).map((it) => ({ description: it.description.trim(), type: it.type, amount: Number(it.amount) || 0 }))
      });
      toast.success('Invoice created');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Student *"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Choose student…"
          options={(students || []).map((s) => ({ value: s._id, label: `${s.name}${s.room?.roomNumber ? ` · Room ${s.room.roomNumber}` : ''}` }))}
        />
        <Input label="Period" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. 2026-10" />
        <Input label="Invoice date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Line items</p>
          <Button size="sm" variant="ghost" icon={Plus} type="button" onClick={() => setItems((a) => [...a, { description: '', type: 'other', amount: '' }])}>
            Add item
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_120px_36px] items-center gap-2">
              <Input value={it.description} onChange={setItem(i, 'description')} placeholder="Description e.g. Room rent" />
              <Select
                value={it.type}
                onChange={setItem(i, 'type')}
                options={LINE_TYPES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))}
              />
              <Input type="number" min="0" value={it.amount} onChange={setItem(i, 'amount')} placeholder="Amount" />
              <Button variant="ghost" size="sm" type="button" className="text-rose-500" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Discount (Rs.)" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        <Input label="Late fee (Rs.)" type="number" min="0" value={lateFee} onChange={(e) => setLateFee(e.target.value)} />
        <Input label="Additional charges (Rs.)" type="number" min="0" value={additionalCharges} onChange={(e) => setAdditionalCharges(e.target.value)} />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/50">
        <span className="text-xs uppercase tracking-wide text-slate-400">Total</span>
        <span className={`text-lg font-extrabold ${total < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{formatMoney(total)}</span>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button loading={busy} type="submit" icon={Receipt}>Create invoice</Button>
      </div>
    </form>
  );
};

const InvoiceView = ({ invoice, onClose, onChanged }) => {
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [busy, setBusy] = useState(false);

  const doVoid = async () => {
    setBusy(true);
    try {
      await apiPost(`/billing/invoices/${invoice._id}/void`, { reason: 'Voided from invoice view' });
      toast.success('Invoice voided');
      setVoiding(false);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
      setVoiding(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open onClose={onClose} title={`Invoice ${invoice.invoiceNumber}`} width="max-w-2xl" footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          {invoice.status !== 'void' ? (
            <>
              {invoice.balance > 0 ? (
                <Button size="sm" icon={Wallet} onClick={() => setPaying(true)}>Receive payment ({formatMoney(invoice.balance)})</Button>
              ) : null}
              {invoice.paid === 0 ? (
                <Button variant="danger" size="sm" onClick={() => setVoiding(true)}>Void</Button>
              ) : null}
            </>
          ) : null}
        </>
      }>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{invoice.studentName}</p>
              <p className="text-xs text-slate-400">
                {invoice.studentPhone || ''} {invoice.room ? `· Room ${invoice.room}` : ''} {invoice.bed ? `Bed ${invoice.bed}` : ''}
              </p>
            </div>
            <Badge tone={STATUS_TONE[invoice.status] || 'slate'}>{invoice.status}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
              <p className="text-slate-400">Period</p>
              <p className="font-semibold text-slate-700 dark:text-slate-200">{invoice.period || '—'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
              <p className="text-slate-400">Invoice date</p>
              <p className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(invoice.invoiceDate)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
              <p className="text-slate-400">Due date</p>
              <p className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(invoice.dueDate)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
              <p className="text-slate-400">Balance</p>
              <p className="font-semibold text-rose-600">{formatMoney(invoice.balance)}</p>
            </div>
          </div>

          <table className="table-base !text-right">
            <thead>
              <tr>
                <th className="!text-left">Item</th>
                <th>Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((it, i) => (
                <tr key={i}>
                  <td className="!text-left">{it.description}</td>
                  <td className="capitalize text-slate-400">{it.type}</td>
                  <td>{formatMoney(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatMoney(invoice.subtotal)}</span></div>
            {invoice.discount > 0 ? <div className="flex justify-between text-slate-500"><span>Discount</span><span>− {formatMoney(invoice.discount)}</span></div> : null}
            {invoice.lateFee > 0 ? <div className="flex justify-between text-slate-500"><span>Late fee</span><span>{formatMoney(invoice.lateFee)}</span></div> : null}
            {invoice.additionalCharges > 0 ? <div className="flex justify-between text-slate-500"><span>Additional</span><span>{formatMoney(invoice.additionalCharges)}</span></div> : null}
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900 dark:border-slate-800 dark:text-white">
              <span>Total</span><span>{formatMoney(invoice.total)}</span>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">Payments ({invoice.payments?.length || 0})</p>
            {invoice.payments?.length ? (
              <div className="space-y-1.5">
                {invoice.payments.map((p) => (
                  <div key={p._id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-800">
                    <span className="font-mono text-xs text-slate-500">{p.receiptNumber}</span>
                    <span className="text-slate-500">{p.method}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(p.amount)}</span>
                    <span className="text-xs text-slate-400">{formatDate(p.date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No payments recorded against this invoice.</p>
            )}
          </div>
        </div>
      </Modal>

      <PaymentModal
        open={paying}
        onClose={() => setPaying(false)}
        studentId={invoice.student}
        invoiceId={invoice._id}
        invoiceBalance={invoice.balance}
        studentName={invoice.studentName}
        onPaid={onChanged}
      />

      <Modal open={voiding} onClose={() => setVoiding(false)} title="Void invoice" width="max-w-sm" footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => setVoiding(false)}>Cancel</Button>
          <Button variant="danger" size="sm" loading={busy} onClick={doVoid}>Yes, void it</Button>
        </>
      }>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Void invoice {invoice.invoiceNumber} ({formatMoney(invoice.total)})? Only invoices with no payments can be voided.
        </p>
      </Modal>
    </>
  );
};

export default function Invoices() {
  usePageTitle('Invoices');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [view, setView] = useState(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [busy, setBusy] = useState(false);

  const { data, loading, refetch } = useApiData(
    () => api.get('/billing/invoices', { params: { page, limit, q: debouncedQ, status } }).then((r) => r.data?.data),
    [page, limit, debouncedQ, status]
  );

  const list = useMemo(() => data?.data || [], [data]);

  const onSearch = (e) => {
    setQ(e.target.value);
    clearTimeout(onSearch.t);
    onSearch.t = setTimeout(() => {
      setDebouncedQ(e.target.value);
      setPage(1);
    }, 350);
  };

  const generate = async () => {
    setBusy(true);
    try {
      const res = await apiPost('/billing/invoices/generate-monthly', { monthOffset: Number(monthOffset) });
      toast.success(res.data?.message || 'Invoices generated');
      setGenOpen(false);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${data?.total || 0} invoices`}
        icon={Receipt}
        actions={
          <>
            <Button variant="outline" icon={CalendarClock} onClick={() => setGenOpen(true)}>Generate monthly</Button>
            <Button icon={Plus} onClick={() => setCreateOpen(true)}>Create invoice</Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search invoice # or student…" className="w-full sm:w-72" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'open', label: 'Open' },
            { value: 'partial', label: 'Partial' },
            { value: 'paid', label: 'Paid' },
            { value: 'void', label: 'Void' }
          ]} className="w-40" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={Receipt}
            title="No invoices found"
            subtitle="Create manually or generate monthly invoices for all active students."
            action={<Button icon={Plus} onClick={() => setCreateOpen(true)}>Create invoice</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Student</th>
                  <th>Period</th>
                  <th>Date</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Balance</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((inv) => (
                  <tr key={inv._id}>
                    <td className="font-mono text-xs text-slate-500">{inv.invoiceNumber}</td>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{inv.studentName}</p>
                      <p className="text-[11px] text-slate-400">{inv.room ? `Room ${inv.room}` : ''}{inv.bed ? ` · ${inv.bed}` : ''}</p>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{inv.period || '—'}</td>
                    <td className="text-slate-500">{formatDate(inv.invoiceDate)}</td>
                    <td className="text-right">{formatMoney(inv.total)}</td>
                    <td className={`text-right font-semibold ${inv.balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{formatMoney(inv.balance)}</td>
                    <td><Badge tone={STATUS_TONE[inv.status] || 'slate'}>{inv.status}</Badge></td>
                    <td>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setView(inv)} icon={Eye}>View</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} limit={limit} total={data?.total || 0} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Invoice" width="max-w-2xl">
        <CreateInvoiceForm onSaved={() => { setCreateOpen(false); refetch(); }} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate monthly invoices" width="max-w-sm" footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => setGenOpen(false)}>Cancel</Button>
          <Button size="sm" loading={busy} onClick={generate}>Generate</Button>
        </>
      }>
        <Select
          label="Month"
          value={monthOffset}
          onChange={(e) => setMonthOffset(Number(e.target.value))}
          options={[
            { value: 0, label: 'This month' },
            { value: -1, label: 'Last month' },
            { value: 1, label: 'Next month' }
          ]}
        />
        <p className="mt-2 text-xs text-slate-400">Creates invoices for all active students (skips students who already have one for that period) and applies late fees.</p>
      </Modal>

      {view ? (
        <InvoiceView
          invoice={view}
          onClose={() => setView(null)}
          onChanged={() => {
            api.get(`/billing/invoices/${view._id}`).then((r) => setView(r.data?.data));
            refetch();
          }}
        />
      ) : null}
    </div>
  );
}