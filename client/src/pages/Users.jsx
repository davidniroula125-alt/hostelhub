import React, { useMemo, useState } from 'react';
import { Edit3, Shield, Trash2, UserCog, UserPlus } from 'lucide-react';
import api, { apiDelete, apiPost, apiPut, errorMessage, fileUrl, uploadFile } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../components/ui';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

const ROLE_TONE = {
  superadmin: 'indigo',
  owner: 'brand',
  manager: 'blue',
  accountant: 'green',
  warden: 'amber',
  staff: 'slate',
  student: 'indigo'
};

const STATUS_TONE = { active: 'green', suspended: 'red', invited: 'amber' };

const UserForm = ({ initial, roles, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    role: initial?.role && initial.role !== 'owner' && initial.role !== 'superadmin' ? initial.role : (roles?.[0] || 'staff'),
    password: '',
    status: initial?.status || 'active'
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const roleOptions = useMemo(
    () => (roles || []).map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) })),
    [roles]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email are required');
    setBusy(true);
    try {
      if (initial?._id) {
        const payload = { name: form.name, phone: form.phone, role: form.role, status: form.status };
        if (form.password) payload.password = form.password;
        await apiPut(`/users/${initial._id}`, payload);
        toast.success('User updated');
      } else {
        if (form.password.length < 6) {
          setBusy(false);
          return toast.error('Password must be at least 6 characters');
        }
        await apiPost('/users', {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          password: form.password
        });
        toast.success('User created');
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
        <Input label="Full name *" value={form.name} onChange={set('name')} />
        <Input label="Email *" type="email" value={form.email} onChange={set('email')} disabled={!!initial?._id} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} />
        <Select label="Role" value={form.role} onChange={set('role')} options={roleOptions} />
        <Input
          label={initial?._id ? 'New password (optional)' : 'Password *'}
          type="password"
          value={form.password}
          onChange={set('password')}
          hint={initial?._id ? 'Leave blank to keep current password' : 'At least 6 characters'}
        />
        {initial?._id ? (
          <Select label="Status" value={form.status} onChange={set('status')} options={[
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' }
          ]} />
        ) : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Create user'}</Button>
      </div>
    </form>
  );
};

export default function Users() {
  usePageTitle('Users');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);

  const { data, loading, refetch } = useApiData(
    () =>
      api
        .get('/users', { params: { page, limit, q: debouncedQ, role, status } })
        .then((r) => r.data?.data),
    [page, limit, debouncedQ, role, status]
  );

  const { data: roles } = useApiData(
    () => api.get('/users/roles/list').then((r) => r.data?.data),
    []
  );

  const list = useMemo(() => data?.data || [], [data]);
  const roleOptions = useMemo(() => (roles || []).map((r) => ({ value: r, label: r })), [roles]);

  const onSearch = (e) => {
    setQ(e.target.value);
    clearTimeout(onSearch.t);
    onSearch.t = setTimeout(() => {
      setDebouncedQ(e.target.value);
      setPage(1);
    }, 350);
  };

  const toggleStatus = async (u) => {
    try {
      await apiPut(`/users/${u._id}`, { status: u.status === 'active' ? 'suspended' : 'active' });
      toast.success(u.status === 'active' ? 'User suspended' : 'User activated');
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    try {
      await apiDelete(`/users/${del._id}`);
      toast.success('User deleted');
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
        title="Users"
        subtitle={`${data?.total || 0} hostel users`}
        icon={UserCog}
        actions={
          <Button
            icon={UserPlus}
            onClick={() => {
              setEditing(null);
              setModal(true);
            }}
          >
            Add User
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search name, email, phone…" className="w-full sm:w-72" />
          <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All roles' },
            ...roleOptions
          ]} className="w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'invited', label: 'Invited' }
          ]} className="w-40" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={UserCog}
            title="No users found"
            subtitle="Add managers, accountants, wardens and staff with their own logins."
            action={
              <Button icon={UserPlus} onClick={() => { setEditing(null); setModal(true); }}>
                Add User
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                          {u.name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><Badge tone={ROLE_TONE[u.role] || 'slate'}>{u.role}</Badge></td>
                    <td className="text-slate-600 dark:text-slate-300">{u.phone || '—'}</td>
                    <td><Badge tone={STATUS_TONE[u.status] || 'slate'}>{u.status}</Badge></td>
                    <td className="text-slate-500">{formatDateTime(u.lastLogin)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setModal(true); }} title="Edit">
                          <Edit3 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(u)}
                          title={u.status === 'active' ? 'Suspend' : 'Activate'}
                        >
                          <Shield size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          onClick={() => setDel(u)}
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit User' : 'Add User'}>
        <UserForm
          initial={editing}
          roles={roles}
          onSaved={() => {
            setModal(false);
            refetch();
          }}
          onCancel={() => setModal(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete user"
        message={`Delete ${del?.name} (${del?.email})? This cannot be undone.`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}