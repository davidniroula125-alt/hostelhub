import React, { useMemo, useState } from 'react';
import { Edit3, Gauge, Plus, Trash2, Zap } from 'lucide-react';
import api, { apiDelete, apiPost, apiPut, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea } from '../components/ui';
import { formatDate, formatMoney } from '../utils/format';

const TABS = [
  { key: 'utilities', label: 'Utilities', icon: Zap },
  { key: 'readings', label: 'Meter Readings', icon: Gauge }
];

const CHARGE_TONE = { fixed: 'blue', metered: 'green', perUsage: 'indigo', monthly: 'amber', custom: 'slate' };

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const UtilityForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    chargeType: initial?.chargeType || 'fixed',
    amount: initial?.amount ?? '',
    ratePerUnit: initial?.ratePerUnit ?? '',
    unit: initial?.unit || 'unit',
    billingEnabled: initial?.billingEnabled ?? true,
    active: initial?.active ?? true,
    appliesTo: initial?.appliesTo || 'all',
    notes: initial?.notes || ''
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Utility name is required');
    setBusy(true);
    try {
      const payload = {
        ...form,
        amount: form.amount !== '' ? Number(form.amount) : undefined,
        ratePerUnit: form.ratePerUnit !== '' ? Number(form.ratePerUnit) : undefined
      };
      if (initial?._id) {
        await apiPut(`/utilities/${initial._id}`, payload);
        toast.success('Utility updated');
      } else {
        await apiPost('/utilities', payload);
        toast.success('Utility added');
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
        <Input label="Name *" value={form.name} onChange={set('name')} placeholder="e.g. Electricity" />
        <Select label="Charge type" value={form.chargeType} onChange={set('chargeType')} options={[
          { value: 'fixed', label: 'Fixed' },
          { value: 'metered', label: 'Metered' },
          { value: 'perUsage', label: 'Per usage' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'custom', label: 'Custom' }
        ]} />
        <Input label="Amount (Rs)" type="number" min="0" value={form.amount} onChange={set('amount')} />
        <Input label="Rate per unit" type="number" min="0" value={form.ratePerUnit} onChange={set('ratePerUnit')} />
        <Input label="Unit" value={form.unit} onChange={set('unit')} placeholder="e.g. kWh, unit" />
        <Select label="Applies to" value={form.appliesTo} onChange={set('appliesTo')} options={[
          { value: 'all', label: 'All' },
          { value: 'students', label: 'Students' },
          { value: 'rooms', label: 'Rooms' }
        ]} />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={!!form.billingEnabled} onChange={(e) => setForm((f) => ({ ...f, billingEnabled: e.target.checked }))} />
          Include in billing
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={!!form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
          Active
        </label>
      </div>
      <Textarea label="Notes" value={form.notes} onChange={set('notes')} />
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Add utility'}</Button>
      </div>
    </form>
  );
};

const ReadingForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    student: initial?.student?._id || '',
    utility: initial?.utility?._id || '',
    previousReading: initial?.previousReading ?? '',
    currentReading: initial?.currentReading ?? '',
    period: initial?.period || thisMonth(),
    ratePerUnit: initial?.ratePerUnit ?? ''
  });

  const { data: studentsData } = useApiData(
    () => api.get('/students', { params: { status: 'active', limit: 100 } }).then((r) => r.data?.data),
    []
  );
  const { data: utilitiesData } = useApiData(
    () => api.get('/utilities', { params: { limit: 100 } }).then((r) => r.data?.data),
    []
  );
  const students = useMemo(() => studentsData?.data || [], [studentsData]);
  const utilities = useMemo(() => utilitiesData?.data || [], [utilitiesData]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.student) return toast.error('Select a student');
    if (!form.utility) return toast.error('Select a utility');
    if (form.previousReading === '' || form.currentReading === '') return toast.error('Previous and current readings are required');
    if (!form.period) return toast.error('Period is required');
    setBusy(true);
    try {
      const payload = {
        student: form.student,
        utility: form.utility,
        previousReading: Number(form.previousReading),
        currentReading: Number(form.currentReading),
        period: form.period
      };
      if (form.ratePerUnit !== '') payload.ratePerUnit = Number(form.ratePerUnit);
      if (initial?._id) {
        await apiPut(`/utilities/readings/${initial._id}`, payload);
        toast.success('Reading updated');
      } else {
        await apiPost('/utilities/readings', payload);
        toast.success('Reading recorded');
      }
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const units = form.previousReading !== '' && form.currentReading !== ''
    ? Number(form.currentReading) - Number(form.previousReading)
    : 0;
  const rate = form.ratePerUnit !== '' ? Number(form.ratePerUnit) : utilities.find((u) => u._id === form.utility)?.ratePerUnit || 0;

  return (
    <form onSubmit={submit} className="space-y-4">
      <Select
        label="Student *"
        value={form.student}
        onChange={set('student')}
        placeholder="Select student"
        options={students.map((s) => ({ value: s._id, label: `${s.name}${s.room?.roomNumber ? ` (${s.room.roomNumber})` : ''}` }))}
      />
      <Select
        label="Utility *"
        value={form.utility}
        onChange={set('utility')}
        placeholder="Select utility"
        options={utilities.map((u) => ({ value: u._id, label: `${u.name}${u.unit ? ` (${u.unit})` : ''}` }))}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Previous reading" type="number" min="0" value={form.previousReading} onChange={set('previousReading')} />
        <Input label="Current reading" type="number" min="0" value={form.currentReading} onChange={set('currentReading')} />
        <Input label="Period (YYYY-MM)" type="month" value={form.period} onChange={set('period')} />
        <Input label="Rate per unit (optional)" type="number" min="0" value={form.ratePerUnit} onChange={set('ratePerUnit')} />
      </div>
      <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
        <span className="text-slate-500 dark:text-slate-400">Usage: </span>
        <span className="font-bold text-slate-800 dark:text-slate-200">{units}</span>
        <span className="mx-2 text-slate-300">·</span>
        <span className="text-slate-500 dark:text-slate-400">Charge: </span>
        <span className="font-bold text-emerald-600">{formatMoney(units * rate)}</span>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Record reading'}</Button>
      </div>
    </form>
  );
};

export default function Utilities() {
  usePageTitle('Utilities');
  const toast = useToast();
  const [tab, setTab] = useState('utilities');

  const [utilPage, setUtilPage] = useState(1);
  const [utilQ, setUtilQ] = useState('');
  const [utilOpen, setUtilOpen] = useState(false);
  const [utilEditing, setUtilEditing] = useState(null);
  const [utilDel, setUtilDel] = useState(null);

  const [readPage, setReadPage] = useState(1);
  const [readOpen, setReadOpen] = useState(false);
  const [readEditing, setReadEditing] = useState(null);
  const [readDel, setReadDel] = useState(null);

  const utilities = useApiData(
    () => api.get('/utilities', { params: { page: utilPage, limit: 20, q: utilQ } }).then((r) => r.data?.data),
    [utilPage, utilQ]
  );
  const readings = useApiData(
    () => api.get('/utilities/readings', { params: { page: readPage, limit: 20 } }).then((r) => r.data?.data),
    [readPage]
  );

  const utilList = useMemo(() => utilities.data?.data || [], [utilities.data]);
  const readList = useMemo(() => readings.data?.data || [], [readings.data]);

  const removeUtil = async () => {
    try {
      await apiDelete(`/utilities/${utilDel._id}`);
      toast.success('Utility deleted');
      setUtilDel(null);
      utilities.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setUtilDel(null);
    }
  };

  const removeReading = async () => {
    try {
      await apiDelete(`/utilities/readings/${readDel._id}`);
      toast.success('Reading deleted');
      setReadDel(null);
      readings.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setReadDel(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Utilities"
        subtitle="Track utilities and meter readings"
        icon={Zap}
        actions={
          tab === 'utilities'
            ? <Button icon={Plus} onClick={() => { setUtilEditing(null); setUtilOpen(true); }}>Add utility</Button>
            : <Button icon={Plus} onClick={() => { setReadEditing(null); setReadOpen(true); }}>Record reading</Button>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === key ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'utilities' ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
            <Input
              value={utilQ}
              onChange={(e) => { setUtilQ(e.target.value); setUtilPage(1); }}
              placeholder="Search utilities…"
              className="w-full sm:w-64"
            />
          </div>
          {utilities.loading ? (
            <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
          ) : !utilList.length ? (
            <EmptyState
              icon={Zap}
              title="No utilities"
              subtitle="Add electricity, water, internet or other utilities."
              action={<Button icon={Plus} onClick={() => { setUtilEditing(null); setUtilOpen(true); }}>Add utility</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Utility</th>
                    <th>Charge type</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Rate</th>
                    <th>Billing</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {utilList.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</p>
                        {u.notes ? <p className="max-w-[200px] truncate text-[11px] text-slate-400">{u.notes}</p> : null}
                      </td>
                      <td><Badge tone={CHARGE_TONE[u.chargeType] || 'slate'}>{u.chargeType}</Badge></td>
                      <td className="text-right">{formatMoney(u.amount)}</td>
                      <td className="text-right">{u.ratePerUnit ? `${u.ratePerUnit} / ${u.unit}` : '—'}</td>
                      <td><Badge tone={u.billingEnabled === false ? 'slate' : 'green'}>{u.billingEnabled === false ? 'off' : 'on'}</Badge></td>
                      <td><Badge tone={u.active === false ? 'slate' : 'green'}>{u.active === false ? 'inactive' : 'active'}</Badge></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setUtilEditing(u); setUtilOpen(true); }}>
                            <Edit3 size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => setUtilDel(u)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={utilPage} limit={20} total={utilities.data?.total || 0} onPage={setUtilPage} />
        </Card>
      ) : (
        <Card>
          {readings.loading ? (
            <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
          ) : !readList.length ? (
            <EmptyState
              icon={Gauge}
              title="No meter readings"
              subtitle="Record a meter reading for a student."
              action={<Button icon={Plus} onClick={() => { setReadEditing(null); setReadOpen(true); }}>Record reading</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Utility</th>
                    <th>Period</th>
                    <th className="text-right">Previous</th>
                    <th className="text-right">Current</th>
                    <th className="text-right">Units</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {readList.map((r) => (
                    <tr key={r._id}>
                      <td className="text-slate-600 dark:text-slate-300">{r.student?.name || '—'}</td>
                      <td className="text-slate-600 dark:text-slate-300">{r.utility?.name || '—'}</td>
                      <td className="text-slate-600 dark:text-slate-300">{r.period || formatDate(r.date)}</td>
                      <td className="text-right">{r.previousReading}</td>
                      <td className="text-right">{r.currentReading}</td>
                      <td className="text-right font-semibold">{r.unitsUsed} {r.utility?.unit || ''}</td>
                      <td className="text-right">{r.ratePerUnit}</td>
                      <td className="text-right font-semibold">{formatMoney(r.total)}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setReadEditing(r); setReadOpen(true); }}>
                            <Edit3 size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => setReadDel(r)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={readPage} limit={20} total={readings.data?.total || 0} onPage={setReadPage} />
        </Card>
      )}

      <Modal open={utilOpen} onClose={() => setUtilOpen(false)} title={utilEditing ? 'Edit utility' : 'Add Utility'} width="max-w-xl">
        <UtilityForm
          initial={utilEditing}
          onSaved={() => { setUtilOpen(false); utilities.refetch(); }}
          onCancel={() => setUtilOpen(false)}
        />
      </Modal>

      <Modal open={readOpen} onClose={() => setReadOpen(false)} title={readEditing ? 'Edit reading' : 'Record Meter Reading'} width="max-w-xl">
        <ReadingForm
          initial={readEditing}
          onSaved={() => { setReadOpen(false); readings.refetch(); }}
          onCancel={() => setReadOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!utilDel}
        title="Delete utility"
        message={`Delete the ${utilDel?.name} utility? This cannot be undone.`}
        onCancel={() => setUtilDel(null)}
        onConfirm={removeUtil}
      />
      <ConfirmDialog
        open={!!readDel}
        title="Delete reading"
        message={`Delete the ${readDel?.period || ''} reading for ${readDel?.student?.name || 'this student'}?`}
        onCancel={() => setReadDel(null)}
        onConfirm={removeReading}
      />
    </div>
  );
}