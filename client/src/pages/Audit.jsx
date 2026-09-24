import React, { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import api, { apiPost, apiPut, apiDelete, errorMessage, fileUrl, uploadFile } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../components/ui';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

const MODULES = [
  'auth', 'admin', 'users', 'dashboard', 'students', 'rooms', 'admissions', 'billing', 'payments', 'invoices',
  'expenses', 'food', 'utilities', 'attendance', 'leaves', 'visitors', 'complaints', 'maintenance', 'inventory',
  'staff', 'payroll', 'notices', 'reports', 'settings', 'checkout', 'documents', 'subscriptions', 'plans'
].sort();

const MODULE_TOONE = {
  auth: 'slate',
  users: 'blue',
  settings: 'indigo',
  staff: 'green',
  payroll: 'indigo',
  students: 'blue',
  billing: 'green',
  rooms: 'amber',
  notices: 'red'
};

const ACTION_TONE = {
  CREATE_STAFF: 'blue',
  UPDATE_STAFF: 'blue',
  DELETE_STAFF: 'red',
  GENERATE_PAYROLL: 'green',
  PAY_SALARY: 'green',
  CREATE_USER: 'blue',
  DELETE_USER: 'red',
  UPDATE_USER: 'blue',
  DELETE_DOCUMENT: 'red',
  DELETE_NOTICE: 'red',
  UPDATE_MEAL_PRICES: 'indigo'
};

const toneOf = (action, module) => ACTION_TONE[action] || MODULE_TOONE[module] || 'slate';

export default function Audit() {
  usePageTitle('Audit Log');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [module, setModule] = useState('all');
  const [action, setAction] = useState('');
  const [debouncedAction, setDebouncedAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, loading, refetch } = useApiData(
    () =>
      api
        .get('/audit', { params: { page, limit, module, action: debouncedAction || undefined, from: from || undefined, to: to || undefined } })
        .then((r) => r.data?.data),
    [page, limit, module, debouncedAction, from, to]
  );

  const list = useMemo(() => data?.data || [], [data]);

  const onSearch = (e) => {
    setAction(e.target.value);
    clearTimeout(onSearch.t);
    onSearch.t = setTimeout(() => {
      setDebouncedAction(e.target.value);
      setPage(1);
    }, 350);
  };

  const reset = () => {
    setModule('all');
    setAction('');
    setDebouncedAction('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle={`${data?.total || 0} recorded activities`}
        icon={ScrollText}
        actions={<Button variant="outline" onClick={reset}>Reset filters</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All modules' },
            ...MODULES.map((m) => ({ value: m, label: m }))
          ]} className="w-44" />
          <Input value={action} onChange={onSearch} placeholder="Filter by action…" className="w-full sm:w-52" />
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-40" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState icon={ScrollText} title="No audit records" subtitle="Activity is recorded as actions are performed in your hostel." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {list.map((log) => (
                  <tr key={log._id}>
                    <td className="whitespace-nowrap text-slate-500">{formatDateTime(log.createdAt)}</td>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{log.user?.name || log.userName || '—'}</p>
                      <p className="text-[11px] text-slate-400">{log.user?.role || log.userRole || ''}</p>
                    </td>
                    <td><Badge tone={MODULE_TOONE[log.module] || 'slate'}>{log.module}</Badge></td>
                    <td><Badge tone={toneOf(log.action, log.module)}>{log.action}</Badge></td>
                    <td className="max-w-md text-slate-600 dark:text-slate-300">{log.description || '—'}</td>
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