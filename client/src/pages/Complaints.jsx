import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import api, { apiDelete, apiPost, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea } from '../components/ui';
import { formatDate, formatDateTime } from '../utils/format';

const STATUS_TONE = { open: 'red', in_progress: 'blue', resolved: 'green', closed: 'slate' };
const PRIORITY_TONE = { low: 'slate', medium: 'blue', high: 'amber', urgent: 'red' };

const CATEGORIES = ['room', 'electricity', 'water', 'food', 'internet', 'cleaning', 'maintenance', 'security', 'other'];

const ComplaintForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    category: initial?.category || 'other',
    priority: initial?.priority || 'medium',
    student: initial?.student?._id || ''
  });

  const { data: studentsData } = useApiData(
    () => api.get('/students', { params: { status: 'active', limit: 100 } }).then((r) => r.data?.data),
    []
  );
  const students = useMemo(() => studentsData?.data || [], [studentsData]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.description.trim()) return toast.error('Description is required');
    setBusy(true);
    try {
      await apiPost('/complaints', form);
      toast.success('Complaint created');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Title *" value={form.title} onChange={set('title')} placeholder="e.g. Broken fan in Room 12" />
      <Textarea label="Description *" value={form.description} onChange={set('description')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Category" value={form.category} onChange={set('category')} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        <Select label="Priority" value={form.priority} onChange={set('priority')} options={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'urgent', label: 'Urgent' }
        ]} />
      </div>
      <Select
        label="Student (optional)"
        value={form.student}
        onChange={set('student')}
        options={[{ value: '', label: '— Not linked to a student —' }, ...students.map((s) => ({ value: s._id, label: `${s.name}${s.room?.roomNumber ? ` (${s.room.roomNumber})` : ''}` }))]}
      />
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">Create complaint</Button>
      </div>
    </form>
  );
};

export default function Complaints() {
  usePageTitle('Complaints');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [resolveForm, setResolveForm] = useState({ status: 'resolved', text: '' });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const { data, loading, refetch } = useApiData(
    () => api.get('/complaints', { params: { page, limit, q: debouncedQ, status, category, priority } }).then((r) => r.data?.data),
    [page, limit, debouncedQ, status, category, priority]
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

  const handleResolve = async () => {
    setBusy(true);
    try {
      await apiPost(`/complaints/${resolving._id}/resolve`, resolveForm);
      toast.success('Complaint updated');
      setResolving(null);
      setResolveForm({ status: 'resolved', text: '' });
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await apiDelete(`/complaints/${del._id}`);
      toast.success('Complaint deleted');
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
        title="Complaints"
        subtitle={`${data?.total || 0} complaints`}
        icon={AlertCircle}
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>New complaint</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search complaints…" className="w-full sm:w-56" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'closed', label: 'Closed' }
          ]} className="w-36" />
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All priorities' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' }
          ]} className="w-36" />
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All categories' },
            ...CATEGORIES.map((c) => ({ value: c, label: c }))
          ]} className="w-40" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={AlertCircle}
            title="No complaints"
            subtitle="Log a complaint, or adjust the filters."
            action={<Button icon={Plus} onClick={() => setOpen(true)}>New complaint</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Complaint</th>
                  <th>Student</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Opened</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{c.title}</p>
                      <p className="max-w-[220px] truncate text-[11px] text-slate-400">{c.description}</p>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{c.student?.name || '—'}</td>
                    <td><Badge tone="indigo">{c.category}</Badge></td>
                    <td><Badge tone={PRIORITY_TONE[c.priority] || 'slate'}>{c.priority}</Badge></td>
                    <td><Badge tone={STATUS_TONE[c.status] || 'slate'}>{c.status}</Badge></td>
                    <td className="text-slate-500">{formatDate(c.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {!['resolved', 'closed'].includes(c.status) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600"
                            onClick={() => { setResolveForm({ status: 'resolved', text: '' }); setResolving(c); }}
                          >
                            <CheckCircle2 size={15} />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => setDel(c)}>
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

      <Modal open={open} onClose={() => setOpen(false)} title="New Complaint" width="max-w-xl">
        <ComplaintForm
          onSaved={() => { setOpen(false); refetch(); }}
          onCancel={() => setOpen(false)}
        />
      </Modal>

      <Modal
        open={!!resolving}
        onClose={() => setResolving(null)}
        title={`Update complaint · ${resolving?.title || ''}`}
        width="max-w-lg"
      >
        <div className="space-y-4">
          <Select
            label="Status"
            value={resolveForm.status}
            onChange={(e) => setResolveForm((r) => ({ ...r, status: e.target.value }))}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' }
            ]}
          />
          <Textarea
            label="Resolution note"
            value={resolveForm.text}
            onChange={(e) => setResolveForm((r) => ({ ...r, text: e.target.value }))}
            placeholder="e.g. Fan replaced. Student notified."
          />
          {resolving?.resolutionNotes?.length ? (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
              {resolving.resolutionNotes.map((n, i) => (
                <div key={i} className="text-xs">
                  <p className="text-slate-600 dark:text-slate-300">{n.text}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{n.byName} · {formatDateTime(n.at)}</p>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setResolving(null)}>Cancel</Button>
            <Button loading={busy} onClick={handleResolve}>Save update</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete complaint"
        message={`Delete "${del?.title}"? This cannot be undone.`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}