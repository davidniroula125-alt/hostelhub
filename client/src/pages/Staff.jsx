import React, { useMemo, useState } from 'react';
import { Edit3, IdCard, Plus, Trash2 } from 'lucide-react';
import api, { apiDelete, apiPost, apiPut, errorMessage, fileUrl, uploadFile } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../components/ui';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

const POSITIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'warden', label: 'Warden' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'cook', label: 'Cook' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'security', label: 'Security' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' }
];

const POSITION_TONE = {
  manager: 'indigo',
  warden: 'amber',
  accountant: 'green',
  cook: 'blue',
  cleaner: 'slate',
  security: 'blue',
  maintenance: 'amber',
  other: 'slate'
};

const STATUS_TONE = { active: 'green', inactive: 'slate' };

const StaffForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    position: initial?.position || 'other',
    phone: initial?.phone || '',
    email: initial?.email || '',
    address: initial?.address || '',
    salary: initial?.salary ?? '',
    joiningDate: initial?.joiningDate ? initial.joiningDate.slice(0, 10) : '',
    status: initial?.status || 'active',
    emergencyName: initial?.emergencyContact?.name || '',
    emergencyPhone: initial?.emergencyContact?.phone || '',
    createAccount: false,
    portalPassword: ''
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        position: form.position,
        phone: form.phone,
        email: form.email,
        address: form.address,
        salary: form.salary !== '' ? Number(form.salary) : 0,
        status: form.status,
        emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone }
      };
      if (form.joiningDate) payload.joiningDate = form.joiningDate;
      if (!initial?._id) {
        if (form.createAccount) {
          payload.createAccount = true;
          payload.portalPassword = form.portalPassword || undefined;
        }
        await apiPost('/staff', payload);
        toast.success('Staff added');
      } else {
        await apiPut(`/staff/${initial._id}`, payload);
        toast.success('Staff updated');
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
        <Input label="Full name *" value={form.name} onChange={set('name')} placeholder="e.g. Ram Shrestha" />
        <Select label="Position" value={form.position} onChange={set('position')} options={POSITIONS} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} />
        <Input label="Address" value={form.address} onChange={set('address')} />
        <Input label="Salary (monthly)" type="number" min="0" value={form.salary} onChange={set('salary')} />
        <Input label="Joining date" type="date" value={form.joiningDate} onChange={set('joiningDate')} />
        <Select label="Status" value={form.status} onChange={set('status')} options={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ]} />
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Emergency Contact</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Name" value={form.emergencyName} onChange={set('emergencyName')} />
          <Input label="Phone" value={form.emergencyPhone} onChange={set('emergencyPhone')} />
        </div>
      </div>
      {!initial?._id ? (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.createAccount}
              onChange={(e) => setForm((f) => ({ ...f, createAccount: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
            />
            Create a login account for this staff
          </label>
          {form.createAccount ? (
            <Input label="Portal password (optional)" value={form.portalPassword} onChange={set('portalPassword')} hint="Defaults to staff123" />
          ) : null}
        </div>
      ) : null}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Add staff'}</Button>
      </div>
    </form>
  );
};

export default function Staff() {
  usePageTitle('Staff');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [position, setPosition] = useState('all');
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);

  const { data, loading, refetch } = useApiData(
    () =>
      api
        .get('/staff', { params: { page, limit, q: debouncedQ, position, status } })
        .then((r) => r.data?.data),
    [page, limit, debouncedQ, position, status]
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

  const remove = async () => {
    try {
      await apiDelete(`/staff/${del._id}`);
      toast.success('Staff deleted');
      setDel(null);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setDel(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={`${data?.total || 0} staff members`}
        icon={IdCard}
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setEditing(null);
              setModal(true);
            }}
          >
            Add Staff
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search name, phone, email, position…" className="w-full sm:w-72" />
          <Select value={position} onChange={(e) => { setPosition(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All positions' },
            ...POSITIONS
          ]} className="w-44" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]} className="w-40" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={IdCard}
            title="No staff found"
            subtitle="Add staff members, or try adjusting the filters."
            action={
              <Button icon={Plus} onClick={() => { setEditing(null); setModal(true); }}>
                Add Staff
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Position</th>
                  <th>Contact</th>
                  <th>Joined</th>
                  <th className="text-right">Salary</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        {s.photo ? (
                          <img src={fileUrl(s.photo)} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                            {s.name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</p>
                          <p className="text-[11px] text-slate-400">{s.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td><Badge tone={POSITION_TONE[s.position] || 'slate'}>{s.position}</Badge></td>
                    <td className="text-slate-600 dark:text-slate-300">{s.phone || '—'}</td>
                    <td className="text-slate-500">{formatDate(s.joiningDate)}</td>
                    <td className="text-right">{formatMoney(s.salary)}</td>
                    <td><Badge tone={STATUS_TONE[s.status] || 'slate'}>{s.status}</Badge></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setModal(true); }}>
                          <Edit3 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          onClick={() => setDel(s)}
                        >
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
        <Pagination page={page} limit={limit} total={data?.total || 0} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Staff' : 'Add Staff'} width="max-w-2xl">
        <StaffForm
          initial={editing}
          onSaved={() => {
            setModal(false);
            refetch();
          }}
          onCancel={() => setModal(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete staff"
        message={`Delete ${del?.name}? This cannot be undone.`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}