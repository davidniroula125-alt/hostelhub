import React, { useMemo, useState } from 'react';
import { Ban, CheckCircle2, Search, UserCog } from 'lucide-react';
import api, { apiPost, errorMessage } from '../../api/client';
import { usePageTitle } from '../../components/Layout';
import { useApiData } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Pagination, Select, Spinner } from '../../components/ui';
import { formatDate } from '../../utils/format';

const STATUS_TONE = { active: 'green', suspended: 'red', inactive: 'slate' };
const ROLE_TONE = {
  superadmin: 'brand',
  owner: 'indigo',
  manager: 'blue',
  accountant: 'green',
  warden: 'amber',
  staff: 'slate',
  student: 'indigo'
};
const ROLES = ['superadmin', 'owner', 'manager', 'accountant', 'warden', 'staff', 'student'];

export default function AdminUsers() {
  usePageTitle('Platform Users');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [busyId, setBusyId] = useState(null);

  const { data, loading, refetch } = useApiData(
    () =>
      api
        .get('/admin/users', {
          params: { page, limit, role, status, q: debouncedQ }
        })
        .then((r) => r.data?.data),
    [page, limit, role, status, debouncedQ]
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

  const changeStatus = async (user, next) => {
    setBusyId(user._id);
    try {
      await apiPost(`/admin/users/${user._id}/status`, { status: next });
      toast.success(`User ${next}`);
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
        title="Users"
        subtitle={`${data?.total || 0} users across the platform`}
        icon={UserCog}
        actions={<Button variant="outline" onClick={refetch}>Refresh</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
            <Input value={q} onChange={onSearch} placeholder="Search name, email, phone…" className="pl-9" />
          </div>
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All roles' },
              ...ROLES.map((r) => ({ value: r, label: r }))
            ]}
            className="w-40"
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' }
            ]}
            className="w-40"
          />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600">
            <Spinner size={26} />
          </div>
        ) : !list.length ? (
          <EmptyState icon={UserCog} title="No users found" subtitle="Try adjusting the filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Hostel</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</p>
                      <p className="text-[11px] text-slate-400">{u.email}</p>
                      {u.phone ? <p className="text-[11px] text-slate-400">{u.phone}</p> : null}
                    </td>
                    <td>
                      <Badge tone={ROLE_TONE[u.role] || 'slate'}>{u.role}</Badge>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{u.hostel?.name || 'Platform'}</td>
                    <td>
                      <Badge tone={STATUS_TONE[u.status] || 'slate'}>{u.status || 'active'}</Badge>
                    </td>
                    <td className="text-xs text-slate-500">{u.lastLogin ? formatDate(u.lastLogin) : '—'}</td>
                    <td className="text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {u.role === 'superadmin' ? (
                          <span className="text-[11px] text-slate-400">Protected</span>
                        ) : u.status === 'suspended' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={busyId === u._id}
                            onClick={() => changeStatus(u, 'active')}
                            title="Activate"
                          >
                            <CheckCircle2 size={14} />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            loading={busyId === u._id}
                            onClick={() => changeStatus(u, 'suspended')}
                            title="Suspend"
                          >
                            <Ban size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          limit={limit}
          total={data?.total || 0}
          onPage={setPage}
          onLimit={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      </Card>
    </div>
  );
}
