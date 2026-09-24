import React, { useMemo, useState } from 'react';
import { Download, Wallet } from 'lucide-react';
import api from '../../api/client';
import { usePageTitle } from '../../components/Layout';
import { useApiData } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, Select, Spinner } from '../../components/ui';
import { downloadCsv, formatDateTime, formatMoney } from '../../utils/format';

const STATUS_TONE = { completed: 'green', refunded: 'amber', void: 'slate' };

export default function AdminPayments() {
  usePageTitle('Payments');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [hostel, setHostel] = useState('');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [exporting, setExporting] = useState(false);

  const { data, loading } = useApiData(
    () =>
      api
        .get('/admin/payments', {
          params: { page, limit, hostel, status, method }
        })
        .then((r) => r.data?.data),
    [page, limit, hostel, status, method]
  );

  const { data: hostels } = useApiData(
    () => api.get('/admin/hostels', { params: { limit: 100 } }).then((r) => r.data?.data?.data || []),
    []
  );

  const list = useMemo(() => data?.data || [], [data]);

  const toRows = (rows) =>
    rows.map((p) => ({
      Receipt: p.receiptNumber || '',
      Student: p.student?.name || p.studentName || '',
      Hostel: p.hostel?.name || '',
      Date: p.date ? new Date(p.date).toLocaleDateString() : '',
      Method: p.method,
      Amount: p.amount,
      Status: p.status,
      'Received by': p.receivedByName || ''
    }));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/payments', {
        params: { page: 1, limit: 10000, hostel, status, method }
      });
      const all = res.data?.data?.data || [];
      downloadCsv('hostelhub-payments.csv', toRows(all));
      toast.success(`Exported ${all.length} payments`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={`${data?.total || 0} payments across all hostels`}
        icon={Wallet}
        actions={
          <Button variant="outline" icon={Download} loading={exporting} onClick={exportCsv}>
            Export
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Select
            value={hostel}
            onChange={(e) => {
              setHostel(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All hostels' },
              ...(hostels || []).map((h) => ({ value: h.hostel._id, label: h.hostel.name }))
            ]}
            className="w-64"
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'completed', label: 'Completed' },
              { value: 'refunded', label: 'Refunded' },
              { value: 'void', label: 'Void' }
            ]}
            className="w-40"
          />
          <Select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All methods' },
              { value: 'cash', label: 'Cash' },
              { value: 'bank', label: 'Bank' },
              { value: 'esewa', label: 'eSewa' },
              { value: 'khalti', label: 'Khalti' },
              { value: 'card', label: 'Card' },
              { value: 'other', label: 'Other' }
            ]}
            className="w-40"
          />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState icon={Wallet} title="No payments found" subtitle="Try a different hostel filter." />
        ) : (
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
                  <th>Received by</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p._id}>
                    <td className="font-mono text-xs text-slate-500">{p.receiptNumber || '—'}</td>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{p.student?.name || p.studentName || '—'}</p>
                      {p.invoiceNumber ? <p className="text-[11px] text-slate-400">Invoice {p.invoiceNumber}</p> : null}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{p.hostel?.name || '—'}</td>
                    <td>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{formatDateTime(p.date)}</p>
                    </td>
                    <td><Badge tone="blue">{p.method}</Badge></td>
                    <td className="text-right font-semibold text-emerald-600">{formatMoney(p.amount)}</td>
                    <td className="text-sm text-slate-500">{p.receivedByName || '—'}</td>
                    <td><Badge tone={STATUS_TONE[p.status] || 'slate'}>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} limit={limit} total={data?.total || 0} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />
      </Card>
    </div>
  );
}