import React, { useMemo, useState } from 'react';
import { Ban, Building2, CheckCircle2, Edit3, Eye, Plus } from 'lucide-react';
import api, { apiPost, apiPut, errorMessage } from '../../api/client';
import { usePageTitle } from '../../components/Layout';
import { useApiData } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../../components/ui';
import { formatDate, formatMoney } from '../../utils/format';

const STATUS_TONE = { trial: 'amber', active: 'green', suspended: 'red' };

const HostelForm = ({ initial, plans, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    code: initial?.code || '',
    type: initial?.type || 'boys',
    email: initial?.email || '',
    phone: initial?.phone || '',
    ownerName: initial?.ownerName || '',
    address: initial?.address?.street || '',
    planCode: initial?.plan?.code || '',
    trialDays: '',
    password: ''
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Hostel name is required');
    if (!form.email.trim()) return toast.error('Owner email is required');
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        email: form.email,
        phone: form.phone,
        ownerName: form.ownerName,
        address: { street: form.address }
      };
      if (form.code.trim()) payload.code = form.code.trim().toUpperCase();
      if (initial?._id) {
        await apiPut(`/admin/hostels/${initial._id}`, payload);
        toast.success('Hostel updated');
      } else {
        await apiPost('/admin/hostels', {
          ...payload,
          planCode: form.planCode || undefined,
          trialDays: form.trialDays !== '' ? Number(form.trialDays) : undefined,
          password: form.password || undefined
        });
        toast.success('Hostel created');
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
        <Input label="Hostel name *" value={form.name} onChange={set('name')} placeholder="e.g. Everest Girls Hostel" />
        <Input
          label="Hostel ID"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          placeholder="e.g. EVR-GH-01"
          hint="3–20 chars. Leave blank to auto-generate"
        />
        <Select
          label="Type"
          value={form.type}
          onChange={set('type')}
          options={[
            { value: 'boys', label: 'Boys' },
            { value: 'girls', label: 'Girls' },
            { value: 'mixed', label: 'Mixed / Co-ed' }
          ]}
        />
        <Input label="Owner email *" type="email" value={form.email} onChange={set('email')} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} />
        <Input label="Owner name" value={form.ownerName} onChange={set('ownerName')} />
        <Input label="Address" value={form.address} onChange={set('address')} placeholder="Street / landmark" />
        {!initial?._id ? (
          <>
            <Select
              label="Trial plan"
              value={form.planCode}
              onChange={set('planCode')}
              options={(plans || []).map((p) => ({ value: p.code, label: p.name }))}
            />
            <Input label="Trial days" type="number" min="1" value={form.trialDays} onChange={set('trialDays')} hint="Defaults to plan trial days" />
            <Input label="Owner password" type="password" value={form.password} onChange={set('password')} hint="Defaults to owner123" />
          </>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Create hostel'}</Button>
      </div>
    </form>
  );
};

const HostelDetail = ({ hostel, onClose }) => {
  const { data, loading } = useApiData(
    () => (hostel?._id ? api.get(`/admin/hostels/${hostel._id}`).then((r) => r.data?.data) : null),
    [hostel?._id]
  );

  const h = data?.hostel || hostel;
  const s = data?.stats || {};

  return (
    <Modal open={!!hostel} onClose={onClose} title={h?.name || 'Hostel'} width="max-w-2xl">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-brand-600">
          <Spinner size={26} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Students', value: s.students ?? '—' },
              { label: 'Active students', value: s.activeStudents ?? '—' },
              { label: 'Users', value: s.users ?? '—' },
              { label: 'Rooms', value: s.rooms ?? '—' },
              { label: 'Revenue', value: formatMoney(s.revenue) },
              { label: 'Status', value: h?.status },
              { label: 'Type', value: h?.type },
              { label: 'Trial ends', value: formatDate(h?.trialEndsAt) }
            ].map((row) => (
              <div key={row.label} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{row.label}</p>
                <p className="mt-1 text-sm font-semibold capitalize text-slate-800 dark:text-slate-200">{row.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Identity</p>
            <p className="mt-1 font-mono text-slate-800 dark:text-slate-200">{h?.code || h?.slug || '—'}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-3">Contact</p>
            <p className="mt-1 text-slate-700 dark:text-slate-300">
              {h?.email || '—'} · {h?.phone || '—'} · {h?.ownerName || '—'}
            </p>
            {h?.address?.street ? (
              <p className="text-xs text-slate-500">{h.address.street}</p>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Users ({(data?.users || []).length})
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800">
              <table className="table-base">
                <tbody>
                  {(data?.users || []).map((u) => (
                    <tr key={u._id}>
                      <td>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </td>
                      <td><Badge tone="indigo">{u.role}</Badge></td>
                      <td><Badge tone={u.status === 'active' ? 'green' : 'red'}>{u.status || 'active'}</Badge></td>
                    </tr>
                  ))}
                  {!(data?.users || []).length ? (
                    <tr><td className="py-4 text-center text-xs text-slate-400">No users</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Subscriptions ({(data?.subscriptions || []).length})
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800">
              <table className="table-base">
                <tbody>
                  {(data?.subscriptions || []).map((sub) => (
                    <tr key={sub._id}>
                      <td className="text-xs text-slate-700 dark:text-slate-300">{sub.plan?.name || '—'}</td>
                      <td className="text-xs text-slate-500">
                        {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
                      </td>
                      <td className="text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatMoney(sub.amount)}
                      </td>
                      <td>
                        <Badge
                          tone={
                            { trial: 'amber', active: 'green', suspended: 'red' }[sub.status] || 'slate'
                          }
                        >
                          {sub.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {!(data?.subscriptions || []).length ? (
                    <tr><td colSpan={4} className="py-4 text-center text-xs text-slate-400">No subscriptions</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default function AdminHostels() {
  usePageTitle('Hostels');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const { data, loading, refetch } = useApiData(
    () =>
      api
        .get('/admin/hostels', {
          params: { page, limit, status, q: debouncedQ }
        })
        .then((r) => r.data?.data),
    [page, limit, status, debouncedQ]
  );

  const { data: plans } = useApiData(() => api.get('/admin/plans').then((r) => r.data?.data), []);

  const list = useMemo(() => data?.data || [], [data]);

  const onSearch = (e) => {
    setQ(e.target.value);
    clearTimeout(onSearch.t);
    onSearch.t = setTimeout(() => {
      setDebouncedQ(e.target.value);
      setPage(1);
    }, 350);
  };

  const changeStatus = async (item, next) => {
    setBusyId(item.hostel._id);
    try {
      await apiPost(`/admin/hostels/${item.hostel._id}/status`, { status: next });
      toast.success(`Hostel ${next === 'suspended' ? 'suspended' : 'activated'}`);
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
        title="Hostels"
        subtitle={`${data?.total || 0} hostels on the platform`}
        icon={Building2}
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setEditing(null);
              setModal(true);
            }}
          >
            Add Hostel
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search by name…" className="w-full sm:w-72" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'trial', label: 'Trial' },
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' }
          ]} className="w-40" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState icon={Building2} title="No hostels found" subtitle="Try adjusting the filters, or add your first hostel." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Hostel</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th>Plan</th>
                  <th className="text-right">Students</th>
                  <th className="text-right">Users</th>
                  <th>Trial ends</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => {
                  const h = item.hostel;
                  return (
                    <tr key={h._id}>
                      <td>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{h.name}</p>
                        <p className="font-mono text-[11px] text-brand-600">{h.code || h.slug || ''}</p>
                        <p className="text-[11px] text-slate-400">{h.email || ''}</p>
                      </td>
                      <td><Badge tone="indigo">{h.type}</Badge></td>
                      <td>
                        <p className="text-slate-600 dark:text-slate-300">{h.ownerName || '—'}</p>
                        <p className="text-[11px] text-slate-400">{h.phone || ''}</p>
                      </td>
                      <td className="text-slate-600 dark:text-slate-300">{item.subscription?.plan?.name || h.plan?.name || '—'}</td>
                      <td className="text-right text-slate-600 dark:text-slate-300">{item.studentCount}</td>
                      <td className="text-right text-slate-600 dark:text-slate-300">{item.userCount}</td>
                      <td className="text-slate-500">{formatDate(h.trialEndsAt)}</td>
                      <td><Badge tone={STATUS_TONE[h.status] || 'slate'}>{h.status}</Badge></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View details"
                            onClick={() => setDetail(h)}
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit"
                            onClick={() => {
                              setEditing(h);
                              setModal(true);
                            }}
                          >
                            <Edit3 size={14} />
                          </Button>
                          {h.status === 'suspended' ? (
                            <Button variant="ghost" size="sm" loading={busyId === h._id} onClick={() => changeStatus(item, 'active')}>
                              <CheckCircle2 size={14} />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                              loading={busyId === h._id}
                              onClick={() => changeStatus(item, 'suspended')}
                            >
                              <Ban size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} limit={limit} total={data?.total || 0} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Hostel' : 'Add Hostel'}
        width="max-w-xl"
      >
        <HostelForm
          initial={editing}
          plans={plans}
          onSaved={() => {
            setModal(false);
            refetch();
          }}
          onCancel={() => setModal(false)}
        />
      </Modal>

      <HostelDetail hostel={detail} onClose={() => setDetail(null)} />
    </div>
  );
}