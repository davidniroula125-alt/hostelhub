import React, { useMemo, useState } from 'react';
import { Plus, Trash2, UserCog, Wrench } from 'lucide-react';
import api, { apiDelete, apiPost, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea } from '../components/ui';
import { formatMoney } from '../utils/format';

const STATUS_TONE = { pending: 'amber', assigned: 'blue', in_progress: 'indigo', completed: 'green', cancelled: 'slate' };
const PRIORITY_TONE = { low: 'slate', medium: 'blue', high: 'amber', urgent: 'red' };

const TicketForm = ({ onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    room: '',
    roomName: '',
    priority: 'medium'
  });

  const { data: roomsData } = useApiData(
    () => api.get('/rooms', { params: { limit: 100 } }).then((r) => r.data?.data),
    []
  );
  const rooms = useMemo(() => roomsData?.data || [], [roomsData]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setBusy(true);
    try {
      const payload = { title: form.title, description: form.description, priority: form.priority };
      if (form.room) {
        payload.room = form.room;
      } else if (form.roomName.trim()) {
        payload.roomName = form.roomName.trim();
      }
      await apiPost('/maintenance', payload);
      toast.success('Maintenance request created');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Title *" value={form.title} onChange={set('title')} placeholder="e.g. Leaking tap in Room 5" />
      <Textarea label="Description" value={form.description} onChange={set('description')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Room (optional)" value={form.room} onChange={set('room')} options={rooms.map((r) => ({ value: r._id, label: `Room ${r.roomNumber}` }))} />
        <Input label="Or room name" value={form.roomName} onChange={set('roomName')} placeholder="e.g. Common kitchen" />
        <Select label="Priority" value={form.priority} onChange={set('priority')} options={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'urgent', label: 'Urgent' }
        ]} />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">Create request</Button>
      </div>
    </form>
  );
};

export default function Maintenance() {
  usePageTitle('Maintenance');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [staffId, setStaffId] = useState('');
  const [statusModal, setStatusModal] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'in_progress', cost: '', notes: '', materials: '' });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const { data, loading, refetch } = useApiData(
    () => api.get('/maintenance', { params: { page, limit, q: debouncedQ, status, priority } }).then((r) => r.data?.data),
    [page, limit, debouncedQ, status, priority]
  );

  const { data: staffData } = useApiData(
    () => api.get('/staff', { params: { limit: 100 } }).then((r) => r.data?.data),
    []
  );

  const list = useMemo(() => data?.data || [], [data]);
  const staff = useMemo(() => staffData?.data || [], [staffData]);

  const onSearch = (e) => {
    setQ(e.target.value);
    clearTimeout(onSearch.t);
    onSearch.t = setTimeout(() => {
      setDebouncedQ(e.target.value);
      setPage(1);
    }, 350);
  };

  const assign = async () => {
    if (!staffId) return toast.error('Select a staff member');
    setBusy(true);
    try {
      await apiPost(`/maintenance/${assigning._id}/assign`, { staffId });
      toast.success('Ticket assigned');
      setAssigning(null);
      setStaffId('');
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async () => {
    setBusy(true);
    try {
      const payload = { status: statusForm.status };
      if (statusForm.cost !== '') payload.cost = Number(statusForm.cost);
      if (statusForm.notes.trim()) payload.notes = statusForm.notes.trim();
      if (statusForm.materials.trim()) payload.materials = statusForm.materials.trim();
      await apiPost(`/maintenance/${statusModal._id}/status`, payload);
      toast.success('Ticket updated');
      setStatusModal(null);
      setStatusForm({ status: 'in_progress', cost: '', notes: '', materials: '' });
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await apiDelete(`/maintenance/${del._id}`);
      toast.success('Ticket deleted');
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
        title="Maintenance"
        subtitle={`${data?.total || 0} maintenance tickets`}
        icon={Wrench}
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>New request</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search tickets…" className="w-full sm:w-56" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'assigned', label: 'Assigned' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' }
          ]} className="w-40" />
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All priorities' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' }
          ]} className="w-40" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={Wrench}
            title="No maintenance tickets"
            subtitle="Create a request, or adjust the filters."
            action={<Button icon={Plus} onClick={() => setOpen(true)}>New request</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Location</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned to</th>
                  <th>Cost</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{t.title}</p>
                      {t.description ? <p className="max-w-[220px] truncate text-[11px] text-slate-400">{t.description}</p> : null}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{t.roomName || '—'}</td>
                    <td><Badge tone={PRIORITY_TONE[t.priority] || 'slate'}>{t.priority}</Badge></td>
                    <td><Badge tone={STATUS_TONE[t.status] || 'slate'}>{t.status}</Badge></td>
                    <td className="text-slate-600 dark:text-slate-300">{t.assignedToName || '—'}</td>
                    <td className="text-right">{t.cost ? formatMoney(t.cost) : '—'}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {!t.assignedTo && !['completed', 'cancelled'].includes(t.status) ? (
                          <Button variant="ghost" size="sm" className="text-brand-600" onClick={() => { setAssigning(t); setStaffId(''); }}>
                            <UserCog size={15} />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStatusForm({
                              status: t.status === 'pending' && t.assignedTo ? 'in_progress' : t.status === 'pending' ? 'assigned' : 'in_progress',
                              cost: t.cost || '',
                              notes: t.notes || '',
                              materials: t.materials || ''
                            });
                            setStatusModal(t);
                          }}
                        >
                          Update
                        </Button>
                        <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => setDel(t)}>
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

      <Modal open={open} onClose={() => setOpen(false)} title="New Maintenance Request" width="max-w-xl">
        <TicketForm
          onSaved={() => { setOpen(false); refetch(); }}
          onCancel={() => setOpen(false)}
        />
      </Modal>

      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Assign staff" width="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Assign "{assigning?.title}" to a staff member.
          </p>
          <Select
            label="Staff"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            placeholder="Select staff"
            options={staff.map((s) => ({ value: s._id, label: `${s.name}${s.position ? ` · ${s.position}` : ''}` }))}
          />
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setAssigning(null)}>Cancel</Button>
            <Button loading={busy} onClick={assign}>Assign</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title={`Update status · ${statusModal?.title || ''}`} width="max-w-lg">
        <div className="space-y-4">
          <Select
            label="Status"
            value={statusForm.status}
            onChange={(e) => setStatusForm((s) => ({ ...s, status: e.target.value }))}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Cost (Rs)" type="number" min="0" value={statusForm.cost} onChange={(e) => setStatusForm((s) => ({ ...s, cost: e.target.value }))} />
            <Input label="Materials" value={statusForm.materials} onChange={(e) => setStatusForm((s) => ({ ...s, materials: e.target.value }))} />
          </div>
          <Textarea label="Notes" value={statusForm.notes} onChange={(e) => setStatusForm((s) => ({ ...s, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setStatusModal(null)}>Cancel</Button>
            <Button loading={busy} onClick={updateStatus}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete ticket"
        message={`Delete "${del?.title}"? This cannot be undone.`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}