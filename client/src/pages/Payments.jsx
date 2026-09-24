import React, { useMemo, useState } from 'react';
import { Eye, Plus, Wallet } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import PaymentModal from '../components/PaymentModal';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../components/ui';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

const METHOD_TONE = {
  cash: 'green',
  bank: 'blue',
  esewa: 'amber',
  khalti: 'indigo',
  card: 'slate',
  other: 'slate'
};

const PaymentView = ({ payment, onClose }) => (
  <Modal open onClose={onClose} title={`Receipt ${payment.receiptNumber}`} width="max-w-md">
    <div className="space-y-3 text-sm">
      <div className="flex justify-between"><span className="text-slate-400">Date</span><span className="text-slate-700 dark:text-slate-200">{formatDateTime(payment.date)}</span></div>
      <div className="flex justify-between"><span className="text-slate-400">Student</span><span className="font-semibold text-slate-800 dark:text-slate-200">{payment.studentName}</span></div>
      <div className="flex justify-between"><span className="text-slate-400">Invoice</span><span>{payment.invoice?.invoiceNumber || '—'}</span></div>
      <div className="flex justify-between"><span className="text-slate-400">Amount</span><span className="font-bold text-slate-900 dark:text-white">{formatMoney(payment.amount)}</span></div>
      <div className="flex justify-between"><span className="text-slate-400">Method</span><span className="capitalize">{payment.method}</span></div>
      <div className="flex justify-between"><span className="text-slate-400">Gateway</span><span className="capitalize">{payment.gateway || 'manual'}</span></div>
      <div className="flex justify-between"><span className="text-slate-400">Received by</span><span>{payment.receivedByName || payment.receivedBy?.name || '—'}</span></div>
      <div className="flex justify-between"><span className="text-slate-400">Transaction ID</span><span className="font-mono text-xs">{payment.transactionId || '—'}</span></div>
      {payment.reference ? <div className="flex justify-between"><span className="text-slate-400">Reference</span><span>{payment.reference}</span></div> : null}
      {payment.notes ? <div className="flex justify-between"><span className="text-slate-400">Notes</span><span>{payment.notes}</span></div> : null}
      <div className="flex justify-between"><span className="text-slate-400">Status</span><Badge tone={payment.status === 'completed' ? 'green' : payment.status === 'refunded' ? 'amber' : 'slate'}>{payment.status}</Badge></div>
    </div>
  </Modal>
);

export default function Payments() {
  usePageTitle('Payments');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [method, setMethod] = useState('all');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [paying, setPaying] = useState(false);
  const [student, setStudent] = useState(null);
  const [view, setView] = useState(null);

  const { data, loading, refetch } = useApiData(
    () => api.get('/billing/payments', { params: { page, limit, q: debouncedQ, method } }).then((r) => r.data?.data),
    [page, limit, debouncedQ, method]
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

  const closePay = () => {
    setPaying(false);
    setStudent(null);
  };

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={`${data?.total || 0} payments recorded`}
        icon={Wallet}
        actions={<Button icon={Plus} onClick={() => setPaying(true)}>Record payment</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search receipt #, student, transaction…" className="w-full sm:w-72" />
          <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All methods' },
            { value: 'cash', label: 'Cash' },
            { value: 'bank', label: 'Bank transfer' },
            { value: 'esewa', label: 'eSewa' },
            { value: 'khalti', label: 'Khalti' },
            { value: 'card', label: 'Card' },
            { value: 'other', label: 'Other' }
          ]} className="w-44" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={Wallet}
            title="No payments found"
            subtitle="Record a payment against an open invoice or a student's balance."
            action={<Button icon={Plus} onClick={() => setPaying(true)}>Record payment</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Invoice</th>
                  <th className="text-right">Amount</th>
                  <th>Method</th>
                  <th>Received by</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p._id}>
                    <td className="font-mono text-xs text-slate-500">{p.receiptNumber}</td>
                    <td className="text-slate-500">{formatDate(p.date)}</td>
                    <td className="font-semibold text-slate-800 dark:text-slate-200">{p.studentName}</td>
                    <td className="font-mono text-xs text-slate-500">{p.invoice?.invoiceNumber || '—'}</td>
                    <td className="text-right font-semibold text-slate-900 dark:text-white">{formatMoney(p.amount)}</td>
                    <td><Badge tone={METHOD_TONE[p.method] || 'slate'}>{p.method}</Badge></td>
                    <td className="text-slate-500">{p.receivedByName || p.receivedBy?.name || '—'}</td>
                    <td><Badge tone={p.status === 'completed' ? 'green' : p.status === 'refunded' ? 'amber' : 'slate'}>{p.status}</Badge></td>
                    <td>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" icon={Eye} onClick={() => setView(p)}>View</Button>
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

      {paying && !student ? (
        <PickStudent
          onClose={closePay}
          onPick={(s) => setStudent(s)}
        />
      ) : null}

      <PaymentModal
        open={paying && !!student}
        onClose={closePay}
        studentId={student?._id}
        invoiceBalance={student?.outstandingBalance}
        studentName={student?.name}
        onPaid={() => {
          refetch();
          closePay();
        }}
      />

      {view ? <PaymentView payment={view} onClose={() => setView(null)} /> : null}
    </div>
  );
}

export function PickStudent({ onClose, onPick }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const { data, loading } = useApiData(
    () => api.get('/students', { params: { status: 'active', q: debouncedQ, limit: 50 } }).then((r) => r.data?.data?.data || []),
    [debouncedQ]
  );

  const onSearch = (e) => {
    setQ(e.target.value);
    clearTimeout(onSearch.t);
    onSearch.t = setTimeout(() => setDebouncedQ(e.target.value), 350);
  };

  const pick = (s) => {
    if (s.outstandingBalance <= 0) {
      toast.success(`${s.name} has no outstanding balance`);
      return;
    }
    onPick(s);
  };

  return (
    <Modal open onClose={onClose} title="Record payment · choose student" width="max-w-xl">
      <Input value={q} onChange={onSearch} placeholder="Search student name or phone…" className="mb-3" autoFocus />
      {loading ? (
        <div className="flex justify-center py-8 text-brand-600"><Spinner size={22} /></div>
      ) : !data.length ? (
        <p className="py-6 text-center text-sm text-slate-400">No active students found.</p>
      ) : (
        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">
          {data.map((s) => (
            <button
              key={s._id}
              onClick={() => pick(s)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-brand-300 dark:border-slate-800"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.name}</p>
                <p className="text-[11px] text-slate-400">{s.phone || ''}{s.room?.roomNumber ? ` · Room ${s.room.roomNumber}${s.bedLabel ? `/${s.bedLabel}` : ''}` : ''}</p>
              </div>
              <span className={`text-sm font-bold ${s.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {formatMoney(s.outstandingBalance)}
              </span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}