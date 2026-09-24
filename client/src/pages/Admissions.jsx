import React, { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import api, { apiPost, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea } from '../components/ui';
import { formatDate, formatMoney } from '../utils/format';

const AdmissionForm = ({ onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    roomId: '',
    bedId: '',
    monthlyRent: '',
    securityDeposit: '',
    depositMethod: 'cash',
    foodPlan: '',
    foodAmount: '',
    admissionDate: new Date().toISOString().slice(0, 10),
    generateFirstInvoice: true,
    createAccount: false,
    portalPassword: 'student123',
    name: '',
    gender: 'male',
    dob: '',
    nationality: 'Nepali',
    citizenshipNumber: '',
    phone: '',
    email: '',
    permanentAddress: '',
    currentAddress: '',
    college: '',
    course: '',
    level: '',
    studentId: '',
    guardianName: '',
    guardianRelationship: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianAddress: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    notes: ''
  });

  const { data: rooms, loading: loadingRooms } = useApiData(
    () => api.get('/admissions/available-beds').then((r) => r.data?.data || []),
    []
  );
  const { data: plans } = useApiData(
    () => api.get('/food/plans').then((r) => (Array.isArray(r.data?.data) ? r.data.data : r.data?.data?.data || [])),
    []
  );

  const room = useMemo(() => rooms?.find((r) => String(r._id) === String(form.roomId)) || null, [rooms, form.roomId]);
  const beds = room?.beds || [];

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickRoom = (e) => {
    const id = e.target.value;
    const r = rooms?.find((x) => String(x._id) === String(id));
    setForm((f) => ({
      ...f,
      roomId: id,
      bedId: '',
      monthlyRent: r ? r.monthlyRent : f.monthlyRent,
      securityDeposit: r ? r.securityDeposit : f.securityDeposit
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Student name is required');
    if (!form.roomId || !form.bedId) return toast.error('Select a room and a bed');
    setBusy(true);
    try {
      await apiPost('/admissions', {
        name: form.name,
        gender: form.gender,
        nationality: form.nationality,
        phone: form.phone,
        email: form.email,
        permanentAddress: form.permanentAddress,
        currentAddress: form.currentAddress,
        college: form.college,
        course: form.course,
        level: form.level,
        studentId: form.studentId,
        roomId: form.roomId,
        bedId: form.bedId,
        monthlyRent: form.monthlyRent !== '' ? Number(form.monthlyRent) : undefined,
        securityDeposit: form.securityDeposit !== '' ? Number(form.securityDeposit) : undefined,
        depositMethod: form.depositMethod,
        foodPlan: form.foodPlan || undefined,
        foodAmount: form.foodAmount !== '' ? Number(form.foodAmount) : undefined,
        admissionDate: form.admissionDate || undefined,
        generateFirstInvoice: form.generateFirstInvoice,
        createAccount: form.createAccount,
        portalPassword: form.portalPassword,
        notes: form.notes,
        guardianName: form.guardianName,
        guardianRelationship: form.guardianRelationship,
        guardianPhone: form.guardianPhone,
        guardianEmail: form.guardianEmail,
        guardianAddress: form.guardianAddress,
        emergencyName: form.emergencyName,
        emergencyPhone: form.emergencyPhone,
        emergencyRelationship: form.emergencyRelationship
      });
      toast.success('Student admitted successfully');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Room & Charges</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {loadingRooms ? (
            <div className="flex items-center gap-2 text-sm text-slate-400"><Spinner size={16} /> Loading available rooms…</div>
          ) : (
            <Select
              label="Room *"
              value={form.roomId}
              onChange={pickRoom}
              placeholder="Choose a room…"
              options={(rooms || []).map((r) => ({
                value: String(r._id),
                label: `${r.roomNumber} (${r.monthlyRent ? `Rs.${r.monthlyRent}` : ''})${r.beds?.length ? ` · ${r.beds.length} bed(s) free` : ''}`
              }))}
            />
          )}
          <Select
            label="Bed *"
            value={form.bedId}
            onChange={set('bedId')}
            disabled={!room}
            placeholder={room ? 'Choose a bed…' : 'Select a room first'}
            options={beds.map((b) => ({ value: String(b._id), label: `${b.label} (${b.status})` }))}
          />
          <Input label="Monthly rent (Rs.)" type="number" min="0" value={form.monthlyRent} onChange={set('monthlyRent')} />
          <Input label="Security deposit (Rs.)" type="number" min="0" value={form.securityDeposit} onChange={set('securityDeposit')} />
          <Select label="Deposit method" value={form.depositMethod} onChange={set('depositMethod')} options={[
            { value: 'cash', label: 'Cash' },
            { value: 'bank', label: 'Bank transfer' },
            { value: 'esewa', label: 'eSewa' },
            { value: 'khalti', label: 'Khalti' },
            { value: 'card', label: 'Card' }
          ]} />
          <Select
            label="Food plan"
            value={form.foodPlan}
            onChange={(e) => {
              const plan = plans?.find((p) => String(p._id) === String(e.target.value));
              setForm((f) => ({ ...f, foodPlan: e.target.value, foodAmount: plan ? plan.amount : f.foodAmount }));
            }}
            options={[
              { value: '', label: 'No plan' },
              ...(plans || []).map((p) => ({ value: String(p._id), label: `${p.name} · ${formatMoney(p.amount)}` }))
            ]}
          />
          <Input label="Food amount (Rs.)" type="number" min="0" value={form.foodAmount} onChange={set('foodAmount')} />
          <Input label="Admission date" type="date" value={form.admissionDate} onChange={set('admissionDate')} />
          <label className="col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
            <input
              type="checkbox"
              checked={form.generateFirstInvoice}
              onChange={(e) => setForm((f) => ({ ...f, generateFirstInvoice: e.target.checked }))}
              className="h-4 w-4 accent-brand-600"
            />
            <span className="text-sm text-slate-600 dark:text-slate-300">Generate first month's invoice</span>
          </label>
          <label className="col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
            <input
              type="checkbox"
              checked={form.createAccount}
              onChange={(e) => setForm((f) => ({ ...f, createAccount: e.target.checked }))}
              className="h-4 w-4 accent-brand-600"
            />
            <span className="text-sm text-slate-600 dark:text-slate-300">Create student login (portal) account</span>
          </label>
          {form.createAccount ? (
            <Input label="Portal password" value={form.portalPassword} onChange={set('portalPassword')} hint="Defaults to student123. An email/logins are sent if an email is given." className="sm:col-span-2" />
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Personal</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Full name *" value={form.name} onChange={set('name')} placeholder="e.g. Anita Lama" />
          <Select
            label="Gender"
            value={form.gender}
            onChange={set('gender')}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' }
            ]}
          />
          <Input label="Date of birth" type="date" value={form.dob} onChange={set('dob')} />
          <Input label="Nationality" value={form.nationality} onChange={set('nationality')} />
          <Input label="Citizenship number" value={form.citizenshipNumber} onChange={set('citizenshipNumber')} />
          <Input label="Student ID" value={form.studentId} onChange={set('studentId')} placeholder="e.g. EVER-001" />
          <Input label="Phone" value={form.phone} onChange={set('phone')} />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} />
          <Input label="Permanent address" value={form.permanentAddress} onChange={set('permanentAddress')} />
          <Input label="Current address" value={form.currentAddress} onChange={set('currentAddress')} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Study</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="College" value={form.college} onChange={set('college')} />
          <Input label="Course" value={form.course} onChange={set('course')} />
          <Input label="Level" value={form.level} onChange={set('level')} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Guardian</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Name" value={form.guardianName} onChange={set('guardianName')} />
          <Input label="Relationship" value={form.guardianRelationship} onChange={set('guardianRelationship')} />
          <Input label="Phone" value={form.guardianPhone} onChange={set('guardianPhone')} />
          <Input label="Email" value={form.guardianEmail} onChange={set('guardianEmail')} />
          <Input label="Address" value={form.guardianAddress} onChange={set('guardianAddress')} className="sm:col-span-2" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Emergency Contact</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Name" value={form.emergencyName} onChange={set('emergencyName')} />
          <Input label="Phone" value={form.emergencyPhone} onChange={set('emergencyPhone')} />
          <Input label="Relationship" value={form.emergencyRelationship} onChange={set('emergencyRelationship')} />
        </div>
      </div>

      <Textarea label="Notes" value={form.notes} onChange={set('notes')} />

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button loading={busy} type="submit" icon={UserPlus}>Admit student</Button>
      </div>
    </form>
  );
};

export default function Admissions() {
  usePageTitle('Admissions');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(false);

  const { data, loading, refetch } = useApiData(
    () => api.get('/admissions', { params: { page, limit, status } }).then((r) => r.data?.data),
    [page, limit, status]
  );

  const list = useMemo(() => data?.data || [], [data]);

  return (
    <div>
      <PageHeader
        title="Admissions"
        subtitle={`${data?.total || 0} admissions recorded`}
        icon={UserPlus}
        actions={<Button icon={UserPlus} onClick={() => setModal(true)}>New Admission</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' }
          ]} className="w-44" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={UserPlus}
            title="No admissions yet"
            subtitle="Use New Admission to register a student, allocate a bed, and (optionally) create their portal account."
            action={<Button icon={UserPlus} onClick={() => setModal(true)}>New Admission</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Admission #</th>
                  <th>Student</th>
                  <th>Room / Bed</th>
                  <th>Rent</th>
                  <th>Deposit</th>
                  <th>Food plan</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a._id}>
                    <td className="font-mono text-xs text-slate-500">{a.admissionNumber}</td>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{a.student?.name || '—'}</p>
                      <p className="text-[11px] text-slate-400">{a.student?.phone || ''}</p>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {a.room?.roomNumber ? `${a.room.roomNumber}` : '—'}
                      {a.bed ? ` · ${a.bed}` : ''}
                    </td>
                    <td>{formatMoney(a.monthlyRent)}</td>
                    <td>{formatMoney(a.securityDeposit)}</td>
                    <td className="text-slate-600 dark:text-slate-300">{a.foodPlan || '—'}</td>
                    <td className="text-slate-500">{formatDate(a.admissionDate)}</td>
                    <td>
                      <Badge tone={a.status === 'completed' ? 'green' : 'red'}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} limit={limit} total={data?.total || 0} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New Admission" width="max-w-3xl">
        <AdmissionForm
          onSaved={() => {
            setModal(false);
            refetch();
            toast.success('Student admitted');
          }}
          onCancel={() => setModal(false)}
        />
      </Modal>
    </div>
  );
}