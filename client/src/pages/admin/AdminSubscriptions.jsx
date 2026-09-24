import React, { useMemo, useState } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import api, { apiPost, errorMessage } from '../../api/client';
import { usePageTitle } from '../../components/Layout';
import { useApiData } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../../components/ui';
import { formatDate, formatMoney } from '../../utils/format';

const STATUS_TONE = {
  trial: 'amber',
  active: 'green',
  expired: 'slate',
  cancelled: 'slate',
  suspended: 'red'
};

const AssignForm = ({ hostels, plans, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    hostel: '',
    plan: '',
    months: '1',
    amount: '',
    method: 'cash',
    paidAt: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.hostel) return toast.error('Select a hostel');
    if (!form.plan) return toast.error('Select a plan');
    setBusy(true);
    try {
      await apiPost('/admin/subscriptions', {
        hostel: form.hostel,
        plan: form.plan,
        months: Number(form.months),
        amount: form.amount !== '' ? Number(form.amount) : undefined,
        method: form.method,
        paidAt: form.paidAt || undefined,
        notes: form.notes
      });
      toast.success('Subscription activated');
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
          label="Hostel *"
          value={form.hostel}
          onChange={set('hostel')}
          placeholder="Select a hostel"
          options={(hostels || []).map((h) => ({ value: h.hostel._id, label: h.hostel.name }))}
        />
        <Select
          label="Plan *"
          value={form.plan}
          onChange={set('plan')}
          placeholder="Select a plan"
          options={(plans || []).map((p) => ({ value: p._id, label: p.name }))}
        />
        <Input label="Months *" type="number" min="1" value={form.months} onChange={set('months')} />
        <Input label="Amount" type="number" min="0" value={form.amount} onChange={set('amount')} hint="Defaults to plan price × months" />
        <Select
          label="Method"
          value={form.method}
          onChange={set('method')}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'bank', label: 'Bank' },
            { value: 'esewa', label: 'eSewa' },
            { value: 'khalti', label: 'Khalti' },
            { value: 'card', label: 'Card' },
            { value: 'other', label: 'Other' }
          ]}
        />
        <Input label="Paid on" type="date" value={form.paidAt} onChange={set('paidAt')} />
      </div>
      <Input label="Notes" value={form.notes} onChange={set('notes')} placeholder="Optional notes" />
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button loading={busy} type="submit">Activate subscription</Button>
      </div>
    </form>
  );
};

export default function AdminSubscriptions() {
  usePageTitle('Subscriptions');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const { data, loading, refetch } = useApiData(
    () =>
      api
        .get('/admin/subscriptions', {
          params: { page, limit, status }
        })
        .then((r) => r.data?.data),
    [page, limit, status]
  );

  const { data: hostels } = useApiData(
    () => api.get('/admin/hostels', { params: { limit: 100 } }).then((r) => r.data?.data?.data || []),
    []
  );
  const { data: plans } = useApiData(() => api.get('/admin/plans').then((r) => r.data?.data || []), []);

  const list = useMemo(() => data?.data || [], [data]);

  const changeStatus = async (sub, next) => {
    setBusyId(sub._id);
    try {
      await apiPost(`/admin/subscriptions/${sub._id}/status`, { status: next });
      toast.success(`Subscription ${next}`);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle={`${data?.total || 0} subscriptions across hostels`}
        icon={CreditCard}
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setModal(true);
            }}
          >
            Assign / Renew
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'trial', label: 'Trial' },
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'expired', label: 'Expired' },
            { value: 'cancelled', label: 'Cancelled' }
          ]} className="w-44" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState icon={CreditCard} title="No subscriptions found" subtitle="Assign a plan to a hostel to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Hostel</th>
                  <th>Plan</th>
                  <th>Period</th>
                  <th className="text-right">Amount</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((sub) => (
                  <tr key={sub._id}>
                    <td className="font-semibold text-slate-800 dark:text-slate-200">{sub.hostel?.name || '—'}</td>
                    <td>
                      <p className="text-slate-700 dark:text-slate-300">{sub.plan?.name || '—'}</p>
                      {sub.plan?.code ? <p className="text-[11px] text-slate-400">{sub.plan.code}</p> : null}
                    </td>
                    <td>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{formatDate(sub.startDate)} → {formatDate(sub.endDate)}</p>
                      {sub.trialEndsAt ? <p className="text-[11px] text-slate-400">Trial ends {formatDate(sub.trialEndsAt)}</p> : null}
                    </td>
                    <td className="text-right font-semibold text-slate-700 dark:text-slate-300">{formatMoney(sub.amount)}</td>
                    <td>
                      <p className="text-xs text-slate-500">{formatDate(sub.paidAt)}</p>
                      {sub.method ? <p className="text-[11px] text-slate-400 capitalize">{sub.method}</p> : null}
                    </td>
                    <td><Badge tone={STATUS_TONE[sub.status] || 'slate'}>{sub.status}</Badge></td>
                    <td>
                      <div className="flex justify-end">
                        <Select
                          value={sub.status}
                          disabled={busyId === sub._id}
                          onChange={(e) => changeStatus(sub, e.target.value)}
                          className="w-36"
                          options={[
                            { value: 'trial', label: 'trial' },
                            { value: 'active', label: 'active' },
                            { value: 'suspended', label: 'suspended' },
                            { value: 'expired', label: 'expired' },
                            { value: 'cancelled', label: 'cancelled' }
                          ]}
                        />
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

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Assign / Renew subscription"
        width="max-w-xl"
      >
        <AssignForm
          hostels={hostels}
          plans={plans}
          onSaved={() => {
            setModal(false);
            refetch();
          }}
          onCancel={() => setModal(false)}
        />
      </Modal>
    </div>
  );
}