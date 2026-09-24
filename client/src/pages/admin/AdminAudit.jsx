import React, { useMemo, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import api from '../../api/client';
import { usePageTitle } from '../../components/Layout';
import { useApiData } from '../../hooks/useApi';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Pagination, Select, Spinner } from '../../components/ui';
import { formatDateTime } from '../../utils/format';

const MODULE_TONE = {
  admin: 'indigo',
  plans: 'brand',
  subscriptions: 'blue',
  hostels: 'green',
  payments: 'emerald',
  students: 'amber',
  rooms: 'slate',
  invoices: 'blue',
  users: 'indigo',
  auth: 'slate',
  notices: 'amber'
};

const MODULES = ['admin', 'plans', 'subscriptions', 'hostels', 'payments', 'students', 'rooms', 'invoices', 'users', 'auth', 'notices'];

export default function AdminAudit() {
  usePageTitle('Audit Log');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [module, setModule] = useState('all');
  const [hostel, setHostel] = useState('');
  const [actionQ, setActionQ] = useState('');
  const [debouncedAction, setDebouncedAction] = useState('');

  const { data: hostels } = useApiData(
    () => api.get('/admin/hostels', { params: { limit: 100 } }).then((r) => r.data?.data?.data || []),
    []
  );

  const { data, loading, refetch } = useApiData(
    () =>
      api
        .get('/admin/audit-logs', {
          params: { page, limit, module, action: debouncedAction, hostel }
        })
        .then((r) => r.data?.data),
    [page, limit, module, debouncedAction, hostel]
  );

  const list = useMemo(() => data?.data || [], [data]);

  const onSearch = (e) => {
    setActionQ(e.target.value);
    clearTimeout(onSearch.t);
    onSearch.t = setTimeout(() => {
      setDebouncedAction(e.target.value);
      setPage(1);
    }, 350);
  };

  const userName = (log) =>
    log.user?.name || log.userName || (log.user?.role ? log.userRole : '—');

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle={`${data?.total || 0} actions across all hostels`}
        icon={ScrollText}
        actions={
          <Button variant="outline" onClick={refetch}>Refresh</Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
            <Input value={actionQ} onChange={onSearch} placeholder="Search action…" className="pl-9" />
          </div>
          <Select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All modules' },
            ...MODULES.map((m) => ({ value: m, label: m }))
          ]} className="w-40" />
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
            className="w-56"
          />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState icon={ScrollText} title="No audit logs found" subtitle="Try adjusting the filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>User</th>
                  <th>Hostel</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {list.map((log) => (
                  <tr key={log._id}>
                    <td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(log.createdAt)}</td>
                    <td><Badge tone="indigo">{log.action}</Badge></td>
                    <td><Badge tone={MODULE_TONE[log.module] || 'slate'}>{log.module}</Badge></td>
                    <td>
                      <p className="text-slate-700 dark:text-slate-300">{userName(log)}</p>
                      {log.userRole ? <p className="text-[11px] text-slate-400">{log.userRole}</p> : null}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{log.hostel?.name || 'Platform'}</td>
                    <td className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{log.description || '—'}</td>
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