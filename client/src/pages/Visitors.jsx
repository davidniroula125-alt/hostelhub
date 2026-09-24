import React, { useMemo, useState } from 'react';
import { LogOut, Plus, Trash2, UserCheck } from 'lucide-react';
import api, { apiDelete, apiPost, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea } from '../components/ui';
import { formatDateTime } from '../utils/format';

const VisitorForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    phone: initial?.phone || '',
    student: initial?.student?._id || '',
    relationship: initial?.relationship || '',
    purpose: initial?.purpose || '',
    idInfo: initial?.idInfo || '',
    vehicleNumber: initial?.vehicleNumber || '',
    notes: initial?.notes || ''
  });

  const { data: studentsData } = useApiData(
    () => api.get('/students', { params: { status: 'active', limit: 100 } }).then((r) => r.data?.data),
    []
  );
  const students = useMemo(() => studentsData?.data || [], [studentsData]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Visitor name is required');
    setBusy(true);
    try {
      await apiPost('/visitors', form);
      toast.success('Visitor checked in');
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
        <Input label="Name *" value={form.name} onChange={set('name')} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} />
      </div>
      <Select
        label="Visiting student (optional)"
        value={form.student}
        onChange={set('student')}
        options={[{ value: '', label: '— Not a student visit —' }, ...students.map((s) => ({ value: s._id, label: `${s.name}${s.room?.roomNumber ? ` (${s.room.roomNumber})` : ''}` }))]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Relationship" value={form.relationship} onChange={set('relationship')} placeholder="e.g. Father, Friend" />
        <Input label="Purpose" value={form.purpose} onChange={set('purpose')} placeholder="e.g. Family visit" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="ID / ID number" value={form.idInfo} onChange={set('idInfo')} />
        <Input label="Vehicle number" value={form.vehicleNumber} onChange={set('vehicleNumber')} />
      </div>
      <Textarea label="Notes" value={form.notes} onChange={set('notes')} />
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">Check in visitor</Button>
      </div>
    </form>
  );
};

export default function Visitors() {
  usePageTitle('Visitors');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [date, setDate] = useState('');
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(null);

  const { data, loading, refetch } = useApiData(
    () => api.get('/visitors', { params: { page, limit, q: debouncedQ, date } }).then((r) => r.data?.data),
    [page, limit, debouncedQ, date]
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

  const exit = async (v) => {
    setBusy(v._id);
    try {
      await apiPost(`/visitors/${v._id}/exit`);
      toast.success(`${v.name} checked out`);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    try {
      await apiDelete(`/visitors/${del._id}`);
      toast.success('Visitor entry deleted');
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
        title="Visitors"
        subtitle={`${data?.total || 0} visitor entries`}
        icon={UserCheck}
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>Check in</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search name, phone, purpose…" className="w-full sm:w-64" />
          <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="w-full sm:w-44" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={UserCheck}
            title="No visitors found"
            subtitle="Check in a visitor, or adjust the filters."
            action={<Button icon={Plus} onClick={() => setOpen(true)}>Check in</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Student</th>
                  <th>Purpose</th>
                  <th>Check in</th>
                  <th>Check out</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((v) => {
                  const left = !!v.exitTime;
                  return (
                    <tr key={v._id}>
                      <td>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{v.name}</p>
                        <p className="text-[11px] text-slate-400">{v.phone || v.idInfo || ''}</p>
                      </td>
                      <td className="text-slate-600 dark:text-slate-300">
                        {v.student?.name || '—'}
                        {v.student?.room?.roomNumber ? <span className="text-[11px] text-slate-400"> · {v.student.room.roomNumber}</span> : null}
                      </td>
                      <td className="max-w-[160px] text-slate-600 dark:text-slate-300">
                        <p className="truncate">{v.purpose || '—'}</p>
                        {v.relationship ? <p className="text-[11px] text-slate-400">{v.relationship}</p> : null}
                      </td>
                      <td className="text-slate-600 dark:text-slate-300">{formatDateTime(v.entryTime)}</td>
                      <td className="text-slate-600 dark:text-slate-300">{left ? formatDateTime(v.exitTime) : '—'}</td>
                      <td><Badge tone={left ? 'slate' : 'green'}>{left ? 'Left' : 'Checked in'}</Badge></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-brand-600"
                            disabled={left}
                            loading={busy === v._id}
                            onClick={() => exit(v)}
                          >
                            <LogOut size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => setDel(v)}>
                            <Trash2 size={14} />
                          </Button>
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

      <Modal open={open} onClose={() => setOpen(false)} title="Check in Visitor" width="max-w-xl">
        <VisitorForm
          onSaved={() => { setOpen(false); refetch(); }}
          onCancel={() => setOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete visitor entry"
        message={`Delete the entry for ${del?.name}? This cannot be undone.`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}