import React, { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, Edit3, Plus, Trash2, Wand2 } from 'lucide-react';
import api, { apiDelete, apiPost, apiPut, errorMessage, fileUrl, uploadFile } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../components/ui';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'esewa', label: 'eSewa' },
  { value: 'khalti', label: 'Khalti' },
  { value: 'other', label: 'Other' }
];

const STATUS_TONE = { pending: 'amber', paid: 'green' };

const currentMonth = () => new Date().toISOString().slice(0, 7);

const monthLabel = (m) => (m ? new Date(`${m}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—');

const SalaryForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    staff: initial?.staff?._id || initial?.staff || '',
    month: initial?.month || currentMonth(),
    basicSalary: initial?.basicSalary ?? 0,
    allowance: initial?.allowance ?? 0,
    bonus: initial?.bonus ?? 0,
    deduction: initial?.deduction ?? 0,
    advance: initial?.advance ?? 0,
    method: initial?.method || 'cash',
    status: initial?.status || 'pending',
    payDate: initial?.payDate ? initial.payDate.slice(0, 10) : '',
    notes: initial?.notes || ''
  });

  const { data: staffData } = useApiData(
    () => api.get('/staff', { params: { limit: 100, status: 'active' } }).then((r) => r.data?.data),
    []
  );
  const staffOptions = useMemo(
    () => (staffData?.data || []).map((s) => ({ value: s._id, label: `${s.name} (${s.position})` })),
    [staffData]
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.staff || !form.month) return toast.error('Staff and month are required');
    setBusy(true);
    try {
      const payload = {
        staff: form.staff,
        month: form.month,
        basicSalary: Number(form.basicSalary) || 0,
        allowance: Number(form.allowance) || 0,
        bonus: Number(form.bonus) || 0,
        deduction: Number(form.deduction) || 0,
        advance: Number(form.advance) || 0,
        method: form.method,
        status: form.status,
        notes: form.notes
      };
      if (form.payDate) payload.payDate = form.payDate;
      if (initial?._id) {
        await apiPut(`/payroll/${initial._id}`, payload);
        toast.success('Salary updated');
      } else {
        await apiPost('/payroll', payload);
        toast.success('Salary record created');
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
        <Select
          label="Staff member *"
          value={form.staff}
          onChange={set('staff')}
          options={staffOptions}
          placeholder="Select staff"
          disabled={!!initial?._id}
        />
        <Input label="Month *" type="month" value={form.month} onChange={set('month')} />
        <Input label="Basic salary" type="number" min="0" value={form.basicSalary} onChange={set('basicSalary')} />
        <Input label="Allowance" type="number" min="0" value={form.allowance} onChange={set('allowance')} />
        <Input label="Bonus" type="number" min="0" value={form.bonus} onChange={set('bonus')} />
        <Input label="Deduction" type="number" min="0" value={form.deduction} onChange={set('deduction')} />
        <Input label="Advance" type="number" min="0" value={form.advance} onChange={set('advance')} />
        <Select label="Payment method" value={form.method} onChange={set('method')} options={METHODS} />
        <Input label="Pay date" type="date" value={form.payDate} onChange={set('payDate')} />
        {initial?._id ? (
          <Select label="Status" value={form.status} onChange={set('status')} options={[
            { value: 'pending', label: 'Pending' },
            { value: 'paid', label: 'Paid' }
          ]} />
        ) : null}
        <Input label="Notes" value={form.notes} onChange={set('notes')} className="sm:col-span-2" />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Create record'}</Button>
      </div>
    </form>
  );
};

export default function Payroll() {
  usePageTitle('Payroll');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [genOpen, setGenOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(currentMonth());
  const [genBusy, setGenBusy] = useState(false);
  const [paying, setPaying] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [payBusy, setPayBusy] = useState(false);

  const { data, loading, refetch } = useApiData(
    () => api.get('/payroll', { params: { page, limit, month, status } }).then((r) => r.data?.data),
    [page, limit, month, status]
  );

  const list = useMemo(() => data?.data || [], [data]);
  const paidTotal = useMemo(() => list.filter((s) => s.status === 'paid').reduce((s, x) => s + x.netSalary, 0), [list]);

  const remove = async () => {
    try {
      await apiDelete(`/payroll/${del._id}`);
      toast.success('Salary record deleted');
      setDel(null);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setDel(null);
    }
  };

  const generate = async () => {
    setGenBusy(true);
    try {
      const res = await apiPost('/payroll/generate', { month: genMonth });
      toast.success(res?.message || 'Salaries generated');
      setGenOpen(false);
      setMonth(genMonth);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setGenBusy(false);
    }
  };

  const pay = async () => {
    setPayBusy(true);
    try {
      await api.post(`/payroll/${paying._id}/pay`, { method: payMethod });
      toast.success('Salary marked as paid');
      setPaying(null);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setPaying(null);
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle={`${data?.total || 0} salary records`}
        icon={Banknote}
        actions={
          <>
            <Button variant="outline" icon={Wand2} onClick={() => setGenOpen(true)}>
              Generate Month
            </Button>
            <Button
              icon={Plus}
              onClick={() => {
                setEditing(null);
                setModal(true);
              }}
            >
              Add Record
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} className="w-44" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'paid', label: 'Paid' }
          ]} className="w-40" />
          <div className="ml-auto text-sm text-slate-500">
            Page total paid: <span className="font-bold text-emerald-600">{formatMoney(paidTotal)}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={Banknote}
            title="No salary records"
            subtitle="Generate payroll for a month, or add a record manually."
            action={<Button icon={Wand2} onClick={() => setGenOpen(true)}>Generate Month</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Month</th>
                  <th className="text-right">Basic</th>
                  <th className="text-right">Allowance</th>
                  <th className="text-right">Bonus</th>
                  <th className="text-right">Deduction</th>
                  <th className="text-right">Advance</th>
                  <th className="text-right">Net</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{s.staff?.name || s.staffName}</p>
                      <p className="text-[11px] text-slate-400">{s.staff?.position || ''}</p>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{monthLabel(s.month)}</td>
                    <td className="text-right">{formatMoney(s.basicSalary)}</td>
                    <td className="text-right text-slate-500">{formatMoney(s.allowance)}</td>
                    <td className="text-right text-slate-500">{formatMoney(s.bonus)}</td>
                    <td className="text-right text-rose-500">-{formatMoney(s.deduction)}</td>
                    <td className="text-right text-rose-500">-{formatMoney(s.advance)}</td>
                    <td className="text-right font-semibold">{formatMoney(s.netSalary)}</td>
                    <td>
                      <Badge tone={STATUS_TONE[s.status] || 'slate'}>{s.status}</Badge>
                      {s.payDate && s.status === 'paid' ? <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(s.payDate)}</p> : null}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {s.status === 'pending' ? (
                          <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => { setPaying(s); setPayMethod('cash'); }}>
                            <CheckCircle2 size={14} />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setModal(true); }}>
                          <Edit3 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          onClick={() => setDel(s)}
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Salary Record' : 'Add Salary Record'} width="max-w-2xl">
        <SalaryForm
          initial={editing}
          onSaved={() => {
            setModal(false);
            refetch();
          }}
          onCancel={() => setModal(false)}
        />
      </Modal>

      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate Monthly Payroll">
        <div className="space-y-4">
          <Input
            label="Month *"
            type="month"
            value={genMonth}
            onChange={(e) => setGenMonth(e.target.value)}
            hint="Creates a pending salary record for every active staff member. Existing records are kept."
          />
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button loading={genBusy} icon={Wand2} onClick={generate}>Generate</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!paying} onClose={() => setPaying(null)} title="Mark as Paid">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Paying <span className="font-semibold">{paying?.staffName}</span> {formatMoney(paying?.netSalary)} for {monthLabel(paying?.month)}.
          </p>
          <Select label="Payment method" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} options={METHODS} />
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setPaying(null)}>Cancel</Button>
            <Button loading={payBusy} icon={CheckCircle2} onClick={pay}>Mark paid</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete salary record"
        message={`Delete the ${monthLabel(del?.month)} record for ${del?.staffName}? This cannot be undone.`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}