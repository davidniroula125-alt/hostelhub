import React, { useState } from 'react';
import { ArrowLeft, CalendarDays, Send } from 'lucide-react';
import api, { apiPost, errorMessage } from '../../api/client';
import { usePageTitle } from '../../components/Layout';
import { useApiData } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Spinner, Textarea } from '../../components/ui';
import { formatDate, formatDateTime } from '../../utils/format';

const LEAVE_TONE = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'slate' };

export default function PortalLeaves() {
  usePageTitle('Leave Requests');
  const toast = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, refetch } = useApiData(() => api.get('/student/leaves').then((r) => r.data?.data), []);
  const list = data || [];

  const submit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) return toast.error('Start date, end date and reason are required');
    if (new Date(endDate) < new Date(startDate)) return toast.error('End date must be after start date');
    setBusy(true);
    try {
      await apiPost('/student/leaves', { startDate, endDate, reason: reason.trim(), emergencyContact });
      toast.success('Leave request submitted');
      setStartDate('');
      setEndDate('');
      setReason('');
      setEmergencyContact('');
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/portal')}>
          <ArrowLeft size={15} /> Portal
        </Button>
      </div>

      <PageHeader
        title="Leave Requests"
        subtitle="Request time off and track its status"
        icon={CalendarDays}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="card-header"><h3 className="text-sm font-bold">Request Leave</h3></div>
          <form onSubmit={submit} className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start date *" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              <Input label="End date *" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
            <Textarea label="Reason *" placeholder="e.g. Going home for festival" value={reason} onChange={(e) => setReason(e.target.value)} required />
            <Input label="Emergency contact (optional)" placeholder="Guardian phone to reach you" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
            <div className="flex justify-end">
              <Button loading={busy} icon={Send} type="submit">Submit request</Button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="card-header"><h3 className="text-sm font-bold">My Requests</h3></div>
          {loading ? (
            <div className="flex h-40 items-center justify-center text-brand-600"><Spinner size={24} /></div>
          ) : !list.length ? (
            <EmptyState icon={CalendarDays} title="No leave requests" subtitle="Use the form to request your first leave." />
          ) : (
            <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800/60">
              {list.map((l) => (
                <div key={l._id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(l.startDate)} → {formatDate(l.endDate)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{l.reason}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Requested {formatDateTime(l.createdAt)}
                      {l.emergencyContact ? ` · Contact ${l.emergencyContact}` : ''}
                    </p>
                  </div>
                  <Badge tone={LEAVE_TONE[l.status] || 'slate'}>{l.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}