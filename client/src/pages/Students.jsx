import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Edit3, Plus, Trash2, UserRound, Users } from 'lucide-react';
import api, { apiDelete, apiPost, apiPut, errorMessage, fileUrl } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../components/ui';
import { downloadCsv, formatDate, formatMoney } from '../utils/format';

const STATUS_TONE = {
  active: 'green',
  notice: 'amber',
  checkedout: 'slate',
  suspended: 'red'
};

const StudentForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    gender: initial?.gender || 'male',
    dob: initial?.dob ? initial.dob.slice(0, 10) : '',
    nationality: initial?.nationality || 'Nepali',
    citizenshipNumber: initial?.citizenshipNumber || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    permanentAddress: initial?.permanentAddress || '',
    currentAddress: initial?.currentAddress || '',
    college: initial?.college || '',
    course: initial?.course || '',
    level: initial?.level || '',
    studentId: initial?.studentId || '',
    guardianName: initial?.guardian?.name || '',
    guardianRelationship: initial?.guardian?.relationship || '',
    guardianPhone: initial?.guardian?.phone || '',
    guardianEmail: initial?.guardian?.email || '',
    guardianAddress: initial?.guardian?.address || '',
    emergencyName: initial?.emergency?.name || '',
    emergencyPhone: initial?.emergency?.phone || '',
    emergencyRelationship: initial?.emergency?.relationship || '',
    monthlyRent: initial?.monthlyRent ?? '',
    notes: initial?.notes || ''
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setBusy(true);
    try {
      const payload = {
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
        monthlyRent: form.monthlyRent !== '' ? Number(form.monthlyRent) : undefined,
        notes: form.notes,
        guardian: { name: form.guardianName, relationship: form.guardianRelationship, phone: form.guardianPhone, email: form.guardianEmail, address: form.guardianAddress },
        emergency: { name: form.emergencyName, phone: form.emergencyPhone, relationship: form.emergencyRelationship }
      };
      if (form.dob) payload.dob = form.dob;
      if (form.citizenshipNumber) payload.citizenshipNumber = form.citizenshipNumber;
      if (initial?._id) {
        await apiPut(`/students/${initial._id}`, payload);
        toast.success('Student updated');
      } else {
        await apiPost('/students', payload);
        toast.success('Student added');
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Monthly rent" type="number" min="0" value={form.monthlyRent} onChange={set('monthlyRent')} />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Add student'}</Button>
      </div>
    </form>
  );
};

export default function Students() {
  usePageTitle('Students');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [gender, setGender] = useState('all');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);

  const { data, loading, refetch } = useApiData(
    () =>
      api
        .get('/students', {
          params: { page, limit, q: debouncedQ, status, gender }
        })
        .then((r) => r.data?.data),
    [page, limit, debouncedQ, status, gender]
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
      await apiDelete(`/students/${del._id}`);
      toast.success('Student deleted');
      setDel(null);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setDel(null);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      'students.csv',
      list.map((s) => ({
        Name: s.name,
        ID: s.studentId || '',
        Phone: s.phone || '',
        Email: s.email || '',
        Gender: s.gender,
        Room: s.room?.roomNumber && s.bedLabel ? `${s.room.roomNumber}/${s.bedLabel}` : s.bedLabel || '',
        'Monthly rent': s.monthlyRent,
        'Outstanding': s.outstandingBalance || 0,
        Status: s.status,
        Admitted: s.admissionDate ? new Date(s.admissionDate).toLocaleDateString() : ''
      }))
    );
  };

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${data?.total || 0} students in your hostel`}
        icon={Users}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} icon={Download}>Export</Button>
            <Button
              icon={Plus}
              onClick={() => {
                setEditing(null);
                setModal(true);
              }}
            >
              Add Student
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search name, phone, email, ID…" className="w-full sm:w-72" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'notice', label: 'Notice' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'checkedout', label: 'Checked out' }
          ]} className="w-40" />
          <Select value={gender} onChange={(e) => { setGender(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All genders' },
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' }
          ]} className="w-36" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={Users}
            title="No students found"
            subtitle="Add your first student, or try adjusting the filters."
            action={
              <Button icon={Plus} onClick={() => { setEditing(null); setModal(true); }}>
                Add Student
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Contact</th>
                  <th>Room / Bed</th>
                  <th className="text-right">Rent</th>
                  <th className="text-right">Outstanding</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <Link to={`/students/${s._id}`} className="flex items-center gap-2.5 group">
                        {s.photo ? (
                          <img src={fileUrl(s.photo)} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                            {s.name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-slate-800 group-hover:text-brand-600 dark:text-slate-200">{s.name}</span>
                      </Link>
                    </td>
                    <td className="text-slate-500">{s.studentId || '—'}</td>
                    <td>
                      <p className="text-slate-600 dark:text-slate-300">{s.phone || '—'}</p>
                      <p className="text-[11px] text-slate-400">{s.email || ''}</p>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {s.room?.roomNumber ? `${s.room.roomNumber}` : '—'}
                      {s.bedLabel ? ` · ${s.bedLabel}` : ''}
                    </td>
                    <td className="text-right">{formatMoney(s.monthlyRent)}</td>
                    <td className={`text-right font-semibold ${s.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {formatMoney(s.outstandingBalance)}
                    </td>
                    <td><Badge tone={STATUS_TONE[s.status] || 'slate'}>{s.status}</Badge></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(s);
                            setModal(true);
                          }}
                        >
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

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Student' : 'Add Student'}
        width="max-w-2xl"
      >
        <StudentForm
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
        title="Delete student"
        message={`Delete ${del?.name}? This cannot be undone.`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}