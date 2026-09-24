import React, { useMemo, useRef, useState } from 'react';
import { Download, Edit3, Paperclip, Plus, Receipt, Trash2, TrendingDown } from 'lucide-react';
import api, { apiDelete, apiPost, apiPut, errorMessage, fileUrl } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea } from '../components/ui';
import { downloadCsv, formatDate, formatMoney } from '../utils/format';

const CATEGORIES = ['rent', 'utilities', 'salary', 'food', 'maintenance', 'transport', 'office', 'marketing', 'other'];

const METHOD_TONE = {
  cash: 'green',
  bank: 'blue',
  esewa: 'amber',
  khalti: 'indigo',
  card: 'slate',
  other: 'slate'
};

const ExpenseForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title || '',
    category: initial?.category || 'rent',
    amount: initial?.amount ?? '',
    date: initial?.date ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    method: initial?.method || 'cash',
    vendor: initial?.vendor || '',
    description: initial?.description || ''
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!Number(form.amount) || Number(form.amount) < 0) return toast.error('Enter a valid amount');
    setBusy(true);
    try {
      const payload = { ...form, amount: Number(form.amount), date: form.date || undefined };
      if (initial?._id) {
        await apiPut(`/expenses/${initial._id}`, payload);
        toast.success('Expense updated');
      } else {
        await apiPost('/expenses', payload);
        toast.success('Expense added');
      }
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
        <Input label="Title *" value={form.title} onChange={set('title')} placeholder="e.g. Electricity bill" />
        <Select
          label="Category *"
          value={form.category}
          onChange={set('category')}
          options={CATEGORIES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))}
        />
        <Input label="Amount (Rs.) *" type="number" min="0" value={form.amount} onChange={set('amount')} />
        <Input label="Date" type="date" value={form.date} onChange={set('date')} />
        <Select
          label="Payment method"
          value={form.method}
          onChange={set('method')}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'bank', label: 'Bank transfer' },
            { value: 'esewa', label: 'eSewa' },
            { value: 'khalti', label: 'Khalti' },
            { value: 'card', label: 'Card' },
            { value: 'other', label: 'Other' }
          ]}
        />
        <Input label="Vendor" value={form.vendor} onChange={set('vendor')} />
        <Textarea label="Description" value={form.description} onChange={set('description')} className="sm:col-span-2" />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Add expense'}</Button>
      </div>
    </form>
  );
};

export default function Expenses() {
  usePageTitle('Expenses');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [category, setCategory] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [receiptFor, setReceiptFor] = useState(null);
  const fileRef = useRef(null);

  const { data, loading, refetch } = useApiData(
    () => api.get('/expenses', { params: { page, limit, category, from, to } }).then((r) => r.data?.data),
    [page, limit, category, from, to]
  );

  const list = useMemo(() => data?.data || [], [data]);
  const total = useMemo(() => list.reduce((s, e) => s + (e.amount || 0), 0), [list]);

  const remove = async () => {
    try {
      await apiDelete(`/expenses/${del._id}`);
      toast.success('Expense deleted');
      setDel(null);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setDel(null);
    }
  };

  const uploadReceipt = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post(`/expenses/${receiptFor._id}/receipt`, fd);
      toast.success('Receipt uploaded');
      setReceiptFor(null);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setReceiptFor(null);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      'expenses.csv',
      list.map((e) => ({
        Title: e.title,
        Category: e.category,
        Amount: e.amount,
        Date: formatDate(e.date),
        Method: e.method,
        Vendor: e.vendor || '',
        Description: e.description || ''
      }))
    );
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`${data?.total || 0} records · ${formatMoney(total)} shown`}
        icon={TrendingDown}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} icon={Download}>Export</Button>
            <Button icon={Plus} onClick={() => { setEditing(null); setModal(true); }}>Add expense</Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All categories' },
            ...CATEGORIES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))
          ]} className="w-44" />
          <Input label="" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
          <Input label="" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-40" />
          <span className="pb-2 text-xs text-slate-400">from → to</span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={Receipt}
            title="No expenses found"
            subtitle="Record rent, utilities, salaries and other operational costs here."
            action={<Button icon={Plus} onClick={() => { setEditing(null); setModal(true); }}>Add expense</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th className="text-right">Amount</th>
                  <th>Method</th>
                  <th>Receipt</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e._id}>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{e.title}</p>
                      {e.description ? <p className="text-[11px] text-slate-400 max-w-[220px] truncate">{e.description}</p> : null}
                    </td>
                    <td><Badge tone="slate">{e.category}</Badge></td>
                    <td className="text-slate-500">{formatDate(e.date)}</td>
                    <td className="text-slate-500">{e.vendor || '—'}</td>
                    <td className="text-right font-semibold text-rose-600">{formatMoney(e.amount)}</td>
                    <td><Badge tone={METHOD_TONE[e.method] || 'slate'}>{e.method}</Badge></td>
                    <td>
                      {e.receipt ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={fileUrl(e.receipt)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost btn-sm"
                            aria-label="Open receipt"
                          >
                            <Paperclip size={14} />
                          </a>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" icon={Paperclip} onClick={() => setReceiptFor(e)}>Add</Button>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(e); setModal(true); }}><Edit3 size={14} /></Button>
                        <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => setDel(e)}><Trash2 size={14} /></Button>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit expense' : 'Add expense'}>
        <ExpenseForm
          initial={editing}
          onSaved={() => { setModal(false); refetch(); }}
          onCancel={() => setModal(false)}
        />
      </Modal>

      <Modal open={!!receiptFor} onClose={() => setReceiptFor(null)} title="Upload receipt" width="max-w-sm" footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => setReceiptFor(null)}>Cancel</Button>
        </>
      }>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => uploadReceipt(e.target.files?.[0])}
          className="input"
        />
        <p className="mt-2 text-xs text-slate-400">Upload a scan/photo of the receipt (image or PDF).</p>
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete expense"
        message={`Delete "${del?.title}" (${formatMoney(del?.amount)})?`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}