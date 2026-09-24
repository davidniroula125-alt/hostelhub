import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Trash2, UtensilsCrossed, UserCheck } from 'lucide-react';
import api, { apiDelete, apiPost, apiPut, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea } from '../components/ui';
import { formatDate, formatMoney } from '../utils/format';

const TABS = [
  { key: 'plans', label: 'Food Plans', icon: UtensilsCrossed },
  { key: 'assignments', label: 'Assignments', icon: UserCheck }
];

const TYPE_TONE = { monthly: 'blue', weekly: 'indigo', daily: 'green', custom: 'slate' };
const ASSIGN_TONE = { active: 'green', paused: 'amber', cancelled: 'slate', completed: 'blue' };

const MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'snacks'];

const PlanForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    type: initial?.type || 'monthly',
    amount: initial?.amount ?? '',
    description: initial?.description || '',
    active: initial?.active ?? true,
    meals: {
      breakfast: initial?.meals?.breakfast ?? true,
      lunch: initial?.meals?.lunch ?? true,
      dinner: initial?.meals?.dinner ?? true,
      snacks: initial?.meals?.snacks ?? false
    }
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setMeal = (k) => (e) => setForm((f) => ({ ...f, meals: { ...f.meals, [k]: e.target.checked } }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Plan name is required');
    if (form.amount === '' || Number(form.amount) < 0) return toast.error('Amount is required');
    setBusy(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (initial?._id) {
        await apiPut(`/food/plans/${initial._id}`, payload);
        toast.success('Plan updated');
      } else {
        await apiPost('/food/plans', payload);
        toast.success('Plan created');
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
        <Input label="Plan name *" value={form.name} onChange={set('name')} placeholder="e.g. Standard Monthly" />
        <Select label="Type" value={form.type} onChange={set('type')} options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'daily', label: 'Daily' },
          { value: 'custom', label: 'Custom' }
        ]} />
        <Input label="Amount (Rs)" type="number" min="0" value={form.amount} onChange={set('amount')} />
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Meals included</p>
        <div className="flex flex-wrap gap-4">
          {MEAL_KEYS.map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.meals[m]} onChange={setMeal(m)} />
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={!!form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
        Active (available for assignment)
      </label>
      <Textarea label="Description" value={form.description} onChange={set('description')} />
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Create plan'}</Button>
      </div>
    </form>
  );
};

const AssignmentForm = ({ onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ student: '', plan: '', amount: '', startDate: '', endDate: '' });

  const { data: studentsData } = useApiData(
    () => api.get('/students', { params: { status: 'active', limit: 100 } }).then((r) => r.data?.data),
    []
  );
  const { data: plansData } = useApiData(
    () => api.get('/food/plans', { params: { limit: 100 } }).then((r) => r.data?.data),
    []
  );
  const students = useMemo(() => studentsData?.data || [], [studentsData]);
  const plans = useMemo(() => plansData?.data || [], [plansData]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.student) return toast.error('Select a student');
    if (!form.plan) return toast.error('Select a plan');
    setBusy(true);
    try {
      const selected = plans.find((p) => p._id === form.plan);
      const payload = { student: form.student, plan: form.plan, amount: form.amount !== '' ? Number(form.amount) : selected?.amount };
      if (form.startDate) payload.startDate = form.startDate;
      if (form.endDate) payload.endDate = form.endDate;
      await apiPost('/food/assignments', payload);
      toast.success('Plan assigned');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

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
        label="Plan *"
        value={form.plan}
        onChange={(e) => {
          const p = plans.find((x) => x._id === e.target.value);
          setForm((f) => ({ ...f, plan: e.target.value, amount: p ? p.amount : f.amount }));
        }}
        placeholder="Select plan"
        options={plans.map((p) => ({ value: p._id, label: `${p.name} (${formatMoney(p.amount)})` }))}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Amount (defaults to plan)" type="number" min="0" value={form.amount} onChange={set('amount')} />
        <Input label="Start date" type="date" value={form.startDate} onChange={set('startDate')} />
      </div>
      <Input label="End date (optional)" type="date" value={form.endDate} onChange={set('endDate')} />
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">Assign plan</Button>
      </div>
    </form>
  );
};

export default function Food() {
  usePageTitle('Food & Meals');
  const toast = useToast();
  const [tab, setTab] = useState('plans');

  const [planPage, setPlanPage] = useState(1);
  const [planQ, setPlanQ] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [planEditing, setPlanEditing] = useState(null);
  const [planDel, setPlanDel] = useState(null);

  const [assignPage, setAssignPage] = useState(1);
  const [assignStatus, setAssignStatus] = useState('all');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDel, setAssignDel] = useState(null);

  const plans = useApiData(
    () => api.get('/food/plans', { params: { page: planPage, limit: 20, q: planQ } }).then((r) => r.data?.data),
    [planPage, planQ]
  );
  const assignments = useApiData(
    () => api.get('/food/assignments', { params: { page: assignPage, limit: 20, status: assignStatus } }).then((r) => r.data?.data),
    [assignPage, assignStatus]
  );

  const planList = useMemo(() => plans.data?.data || [], [plans.data]);
  const assignList = useMemo(() => assignments.data?.data || [], [assignments.data]);

  const removePlan = async () => {
    try {
      await apiDelete(`/food/plans/${planDel._id}`);
      toast.success('Plan deleted');
      setPlanDel(null);
      plans.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setPlanDel(null);
    }
  };

  const changeStatus = async (a, status) => {
    try {
      await apiPut(`/food/assignments/${a._id}`, { status });
      toast.success('Assignment updated');
      assignments.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const removeAssignment = async () => {
    try {
      await apiDelete(`/food/assignments/${assignDel._id}`);
      toast.success('Assignment removed');
      setAssignDel(null);
      assignments.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setAssignDel(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Food & Meals"
        subtitle="Manage food plans and student assignments"
        icon={UtensilsCrossed}
        actions={
          tab === 'plans'
            ? <Button icon={Plus} onClick={() => { setPlanEditing(null); setPlanOpen(true); }}>Add plan</Button>
            : <Button icon={Plus} onClick={() => setAssignOpen(true)}>Assign plan</Button>
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

      {tab === 'plans' ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
            <Input
              value={planQ}
              onChange={(e) => { setPlanQ(e.target.value); setPlanPage(1); }}
              placeholder="Search plans…"
              className="w-full sm:w-64"
            />
          </div>
          {plans.loading ? (
            <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
          ) : !planList.length ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No food plans"
              subtitle="Create your first food plan."
              action={<Button icon={Plus} onClick={() => { setPlanEditing(null); setPlanOpen(true); }}>Add plan</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Type</th>
                    <th>Meals</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {planList.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</p>
                        {p.description ? <p className="max-w-[220px] truncate text-[11px] text-slate-400">{p.description}</p> : null}
                      </td>
                      <td><Badge tone={TYPE_TONE[p.type] || 'slate'}>{p.type}</Badge></td>
                      <td className="text-slate-600 dark:text-slate-300">
                        {MEAL_KEYS.filter((m) => p.meals?.[m]).join(', ') || '—'}
                      </td>
                      <td className="text-right">{formatMoney(p.amount)}</td>
                      <td><Badge tone={p.active === false ? 'slate' : 'green'}>{p.active === false ? 'inactive' : 'active'}</Badge></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setPlanEditing(p); setPlanOpen(true); }}>
                            <Edit3 size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => setPlanDel(p)}>
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
          <Pagination page={planPage} limit={20} total={plans.data?.total || 0} onPage={setPlanPage} />
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
            <Select value={assignStatus} onChange={(e) => { setAssignStatus(e.target.value); setAssignPage(1); }} options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'paused', label: 'Paused' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'completed', label: 'Completed' }
            ]} className="w-44" />
          </div>
          {assignments.loading ? (
            <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
          ) : !assignList.length ? (
            <EmptyState
              icon={UserCheck}
              title="No assignments"
              subtitle="Assign a food plan to a student."
              action={<Button icon={Plus} onClick={() => setAssignOpen(true)}>Assign plan</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Plan</th>
                    <th>Started</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignList.map((a) => (
                    <tr key={a._id}>
                      <td>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{a.student?.name || '—'}</p>
                        <p className="text-[11px] text-slate-400">{a.student?.room?.roomNumber ? `${a.student.room.roomNumber}${a.student.bedLabel ? ` · ${a.student.bedLabel}` : ''}` : ''}</p>
                      </td>
                      <td className="text-slate-600 dark:text-slate-300">{a.plan?.name || '—'}</td>
                      <td className="text-slate-600 dark:text-slate-300">{formatDate(a.startDate)}</td>
                      <td className="text-right">{formatMoney(a.amount)}</td>
                      <td>
                        <Select
                          value={a.status}
                          onChange={(e) => changeStatus(a, e.target.value)}
                          options={[
                            { value: 'active', label: 'Active' },
                            { value: 'paused', label: 'Paused' },
                            { value: 'cancelled', label: 'Cancelled' },
                            { value: 'completed', label: 'Completed' }
                          ]}
                          className="w-32"
                        />
                        <Badge tone={ASSIGN_TONE[a.status] || 'slate'}>{a.status}</Badge>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => setAssignDel(a)}>
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
          <Pagination page={assignPage} limit={20} total={assignments.data?.total || 0} onPage={setAssignPage} />
        </Card>
      )}

      <Modal open={planOpen} onClose={() => setPlanOpen(false)} title={planEditing ? 'Edit plan' : 'Add Food Plan'} width="max-w-xl">
        <PlanForm
          initial={planEditing}
          onSaved={() => { setPlanOpen(false); plans.refetch(); }}
          onCancel={() => setPlanOpen(false)}
        />
      </Modal>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Food Plan" width="max-w-xl">
        <AssignmentForm
          onSaved={() => { setAssignOpen(false); assignments.refetch(); }}
          onCancel={() => setAssignOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!planDel}
        title="Delete food plan"
        message={`Delete ${planDel?.name}? This cannot be undone.`}
        onCancel={() => setPlanDel(null)}
        onConfirm={removePlan}
      />
      <ConfirmDialog
        open={!!assignDel}
        title="Remove assignment"
        message={`Remove the food plan for ${assignDel?.student?.name || 'this student'}?`}
        onCancel={() => setAssignDel(null)}
        onConfirm={removeAssignment}
      />
    </div>
  );
}