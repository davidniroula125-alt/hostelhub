import React, { useMemo, useState } from 'react';
import { Edit3, Megaphone, Plus, Trash2 } from 'lucide-react';
import api, { apiDelete, apiPost, apiPut, errorMessage, fileUrl, uploadFile } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea } from '../components/ui';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const PRIORITY_TONE = {
  low: 'slate',
  normal: 'blue',
  high: 'amber',
  urgent: 'red'
};

const AUDIENCE_TONE = {
  all: 'slate',
  students: 'indigo',
  staff: 'green'
};

const NoticeForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    priority: initial?.priority || 'normal',
    visibleTo: initial?.visibleTo || 'all',
    publishDate: initial?.publishDate ? initial.publishDate.slice(0, 10) : '',
    expiryDate: initial?.expiryDate ? initial.expiryDate.slice(0, 10) : ''
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return toast.error('Title and description are required');
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        visibleTo: form.visibleTo
      };
      if (form.publishDate) payload.publishDate = form.publishDate;
      if (form.expiryDate) payload.expiryDate = form.expiryDate;
      if (initial?._id) {
        await apiPut(`/notices/${initial._id}`, payload);
        toast.success('Notice updated');
      } else {
        await apiPost('/notices', payload);
        toast.success('Notice published');
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
      <Input label="Title *" value={form.title} onChange={set('title')} placeholder="e.g. Water supply maintenance" />
      <Textarea label="Description *" value={form.description} onChange={set('description')} rows={4} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Priority" value={form.priority} onChange={set('priority')} options={PRIORITIES} />
        <Select label="Visible to" value={form.visibleTo} onChange={set('visibleTo')} options={[
          { value: 'all', label: 'Everyone' },
          { value: 'students', label: 'Students only' },
          { value: 'staff', label: 'Staff only' }
        ]} />
        <Input label="Publish date" type="date" value={form.publishDate} onChange={set('publishDate')} />
        <Input label="Expiry date (optional)" type="date" value={form.expiryDate} onChange={set('expiryDate')} />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Publish notice'}</Button>
      </div>
    </form>
  );
};

export default function Notices() {
  usePageTitle('Notices');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [priority, setPriority] = useState('all');
  const [active, setActive] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);

  const { data, loading, refetch } = useApiData(
    () =>
      api
        .get('/notices', { params: { page, limit, q: debouncedQ, priority, active: active === 'active' ? 'true' : undefined } })
        .then((r) => r.data?.data),
    [page, limit, debouncedQ, priority, active]
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
      await apiDelete(`/notices/${del._id}`);
      toast.success('Notice deleted');
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
        title="Notices"
        subtitle={`${data?.total || 0} notices`}
        icon={Megaphone}
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setEditing(null);
              setModal(true);
            }}
          >
            New Notice
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search title or description…" className="w-full sm:w-72" />
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All priorities' },
            ...PRIORITIES
          ]} className="w-40" />
          <Select value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All notices' },
            { value: 'active', label: 'Currently active' }
          ]} className="w-44" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={Megaphone}
            title="No notices found"
            subtitle="Publish a notice to keep your hostel informed."
            action={
              <Button icon={Plus} onClick={() => { setEditing(null); setModal(true); }}>
                New Notice
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Notice</th>
                  <th>Priority</th>
                  <th>Visible to</th>
                  <th>Published</th>
                  <th>Expires</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((n) => (
                  <tr key={n._id}>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                      <p className="max-w-md truncate text-xs text-slate-400">{n.description}</p>
                    </td>
                    <td><Badge tone={PRIORITY_TONE[n.priority] || 'slate'}>{n.priority}</Badge></td>
                    <td><Badge tone={AUDIENCE_TONE[n.visibleTo] || 'slate'}>{n.visibleTo}</Badge></td>
                    <td className="text-slate-500">{formatDate(n.publishDate)}</td>
                    <td className="text-slate-500">{n.expiryDate ? formatDate(n.expiryDate) : '—'}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(n); setModal(true); }}>
                          <Edit3 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          onClick={() => setDel(n)}
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Notice' : 'New Notice'}>
        <NoticeForm
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
        title="Delete notice"
        message={`Delete "${del?.title}"? This cannot be undone.`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}