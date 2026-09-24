import React, { useMemo, useState } from 'react';
import { CheckCircle2, GraduationCap, Plus, XCircle } from 'lucide-react';
import api, { apiPost, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea } from '../components/ui';
import { formatDate } from '../utils/format';

const STATUS_TONE = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'slate' };

const LeaveForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    student: initial?.student?._id || '',
    startDate: initial?.startDate ? new Date(initial.startDate).toISOString().slice(0, 10) : '',
    endDate: initial?.endDate ? new Date(initial.endDate).toISOString().slice(0, 10) : '',
    reason: initial?.reason || '',
    emergencyContact: initial?.emergencyContact || ''
  });

  const { data: studentsData } = useApiData(
    () => api.get('/students', { params: { status: 'active', limit: 100 } }).then((r) => r.data?.data),
    []
  );
  const students = useMemo(() => studentsData?.data || [], [studentsData]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.student) return toast.error('Select a student');
    if (!form.startDate || !form.endDate) return toast.error('Start and end dates are required');
    if (!form.reason.trim()) return toast.error('Reason is required');
    setBusy(true);
    try {
      await apiPost('/leaves', form);
      toast.success('Leave request recorded');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Select
        label="Student *"
        value={form.student}
        onChange={set('student')}
        placeholder="Select student"
        options={students.map((s) => ({ value: s._id, label: `${s.name}${s.room?.roomNumber ? ` (${s.room.roomNumber})` : ''}` }))}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Start date *" type="date" value={form.startDate} onChange={set('startDate')} />
        <Input label="End date *" type="date" value={form.endDate} onChange={set('endDate')} />
      </div>
      <Textarea label="Reason *" value={form.reason} onChange={set('reason')} placeholder="e.g. Going home for Dashain" />
      <Input label="Emergency contact" value={form.emergencyContact} onChange={set('emergencyContact')} />
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">Record leave</Button>
      </div>
    </form>
  );
};

export default function Leaves() {
  usePageTitle('Leaves');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [deciding, setDeciding] = useState(null);
  const [decision, setDecision] = useState({ status: 'approved', notes: '' });
  const [busy, setBusy] = useState(false);

  const { data, loading, refetch } = useApiData(
    () => api.get('/leaves', { params: { page, limit, status } }).then((r) => r.data?.data),
    [page, limit, status]
  );

  const list = useMemo(() => data?.data || [], [data]);

  const decide = async () => {
    setBusy(true);
    try {
      await apiPost(`/leaves/${deciding._id}/decide`, decision);
      toast.success(`Leave ${decision.status}`);
      setDeciding(null);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Leave Requests"
        subtitle={`${data?.total || 0} leave requests`}
        icon={GraduationCap}
        actions={
          <Button icon={Plus} onClick={() => setOpen(true)}>
            Record Leave
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'cancelled', label: 'Cancelled' }
          ]} className="w-44" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={GraduationCap}
            title="No leave requests"
            subtitle="Record a leave or try another status filter."
            action={<Button icon={Plus} onClick={() => setOpen(true)}>Record Leave</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((l) => (
                  <tr key={l._id}>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{l.student?.name || '—'}</p>
                      <p className="text-[11px] text-slate-400">
                        {l.student?.room?.roomNumber ? `${l.student.room.roomNumber}${l.student.bedLabel ? ` · ${l.student.bedLabel}` : ''}` : ''}
                      </p>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {formatDate(l.startDate)} → {formatDate(l.endDate)}
                    </td>
                    <td className="max-w-[240px]">
                      <p className="truncate text-slate-600 dark:text-slate-300">{l.reason}</p>
                      {l.emergencyContact ? <p className="text-[11px] text-slate-400">Contact: {l.emergencyContact}</p> : null}
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[l.status] || 'slate'}>{l.status}</Badge>
                      {l.decisionNotes ? <p className="mt-1 max-w-[200px] text-[11px] text-slate-400">{l.decisionNotes}</p> : null}
                    </td>
                    <td>
                      {l.status === 'pending' ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => { setDecision({ status: 'approved', notes: '' }); setDeciding(l); }}>
                            <CheckCircle2 size={15} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => { setDecision({ status: 'rejected', notes: '' }); setDeciding(l); }}>
                            <XCircle size={15} />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-right text-[11px] text-slate-400">{l.decidedAt ? new Date(l.decidedAt).toLocaleDateString() : ''}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} limit={limit} total={data?.total || 0} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Record Leave" width="max-w-xl">
        <LeaveForm
          onSaved={() => { setOpen(false); refetch(); }}
          onCancel={() => setOpen(false)}
        />
      </Modal>

      <Modal
        open={!!deciding}
        onClose={() => setDeciding(null)}
        title={`${decision.status === 'approved' ? 'Approve' : 'Reject'} leave · ${deciding?.student?.name || ''}`}
        width="max-w-lg"
      >
        <div className="space-y-4">
          <Select
            label="Decision"
            value={decision.status}
            onChange={(e) => setDecision((d) => ({ ...d, status: e.target.value }))}
            options={[
              { value: 'approved', label: 'Approve' },
              { value: 'rejected', label: 'Reject' },
              { value: 'cancelled', label: 'Cancel' }
            ]}
          />
          <Textarea label="Notes" value={decision.notes} onChange={(e) => setDecision((d) => ({ ...d, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setDeciding(null)}>Cancel</Button>
            <Button loading={busy} onClick={decide}>Save decision</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}