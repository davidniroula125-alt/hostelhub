import React, { useEffect, useMemo, useState } from 'react';
import { BedDouble, DoorOpen, Edit3, Plus, Trash2, UserRoundPlus, X } from 'lucide-react';
import api, { apiDelete, apiPatch, apiPost, apiPut, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../components/ui';
import { formatMoney } from '../utils/format';

const ROOM_STATUS = {
  available: 'green',
  partial: 'amber',
  full: 'red',
  maintenance: 'rose',
  reserved: 'blue'
};

const BED_TONE = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  occupied: 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900',
  reserved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
};

const RoomForm = ({ initial, hostelId, hostels, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    roomNumber: initial?.roomNumber || '',
    floor: initial?.floor || '',
    roomType: initial?.roomType || 'bedroom',
    bedsCount: initial?.beds?.length || 2,
    bedLabels: initial?.beds?.map((b) => b.label).join(',') || '',
    monthlyRent: initial?.monthlyRent ?? '',
    securityDeposit: initial?.securityDeposit ?? '',
    facilities: initial?.facilities?.join(',') || '',
    notes: initial?.notes || '',
    hostel: initial?.hostel?._id || initial?.hostel || hostelId || ''
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.roomNumber.trim()) return toast.error('Room number is required');
    if (!initial?._id && Array.isArray(hostels) && hostels.length && !form.hostel) {
      return toast.error('Select a hostel for this room');
    }
    setBusy(true);
    try {
      const payload = {
        roomNumber: form.roomNumber.trim(),
        floor: form.floor,
        roomType: form.roomType,
        monthlyRent: form.monthlyRent !== '' ? Number(form.monthlyRent) : 0,
        securityDeposit: form.securityDeposit !== '' ? Number(form.securityDeposit) : 0,
        facilities: form.facilities.split(',').map((s) => s.trim()).filter(Boolean),
        notes: form.notes
      };
      if (initial?._id) {
        await apiPut(`/rooms/${initial._id}`, payload);
        toast.success('Room updated');
      } else {
        payload.bedsCount = Number(form.bedsCount) || 0;
        if (form.bedLabels.trim()) payload.bedLabels = form.bedLabels.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
        if (form.hostel) payload.hostel = form.hostel;
        await apiPost('/rooms', payload);
        toast.success('Room created');
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
        <Input label="Room number *" value={form.roomNumber} onChange={set('roomNumber')} placeholder="e.g. 101" />
        <Input label="Floor" value={form.floor} onChange={set('floor')} placeholder="e.g. 1 / Ground" />
        <Select
          label="Room type"
          value={form.roomType}
          onChange={set('roomType')}
          options={[
            { value: 'bedroom', label: 'Bedroom' },
            { value: 'dormitory', label: 'Dormitory' },
            { value: 'suite', label: 'Suite' },
            { value: 'deluxe', label: 'Deluxe' },
            { value: 'custom', label: 'Custom' }
          ]}
        />
        {!initial?._id ? (
          <Input label="Bed count" type="number" min="0" max="20" value={form.bedsCount} onChange={set('bedsCount')} />
        ) : null}
        {!initial?._id && hostels?.length ? (
          <Select
            label="Hostel *"
            value={form.hostel}
            onChange={set('hostel')}
            placeholder="Choose hostel…"
            options={(hostels || []).map((h) => ({ value: h._id, label: `${h.name}${h.code ? ` · ${h.code}` : ''}` }))}
          />
        ) : null}
      </div>
      {!initial?._id ? (
        <Input label="Bed labels" value={form.bedLabels} onChange={set('bedLabels')} hint="Comma separated (e.g. A,B,C). Leave empty for A–J." />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Monthly rent (Rs.)" type="number" min="0" value={form.monthlyRent} onChange={set('monthlyRent')} />
        <Input label="Security deposit (Rs.)" type="number" min="0" value={form.securityDeposit} onChange={set('securityDeposit')} />
      </div>
      <Input label="Facilities" value={form.facilities} onChange={set('facilities')} placeholder="e.g. WiFi, Attached bath, Study table" />
      <Input label="Notes" value={form.notes} onChange={set('notes')} />
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Create room'}</Button>
      </div>
    </form>
  );
};

const AssignBed = ({ open, room, bed, onClose, onDone }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [studentId, setStudentId] = useState('');
  const { data, loading } = useApiData(
    () => (open && room?._id && bed?._id ? api.get('/students', { params: { status: 'active', limit: 200 } }).then((r) => r.data?.data?.data || []) : null),
    [open, room?._id, bed?._id]
  );

  if (!bed || !room) return null;

  const assign = async () => {
    if (!studentId) return toast.error('Select a student');
    setBusy(true);
    try {
      await apiPost(`/rooms/${room._id}/beds/${bed._id}/assign`, { studentId });
      toast.success('Bed assigned');
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Assign bed ${bed?.label || ''} · Room ${room?.roomNumber || ''}`} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={busy} onClick={assign} icon={UserRoundPlus}>Assign</Button>
      </>
    }>
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6 text-brand-600"><Spinner size={22} /></div>
        ) : (
          <Select
            label="Student *"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Choose active student…"
            options={(data || []).map((s) => ({ value: s._id, label: `${s.name}${s.phone ? ` · ${s.phone}` : ''}` }))}
          />
        )}
        <p className="text-xs text-slate-400">Only active students without an assigned bed can be selected by the backend.</p>
      </div>
    </Modal>
  );
};

const RoomDetail = ({ room, onClose, onChanged, onEdit, onDelete }) => {
  const toast = useToast();
  const [detail, setDetail] = useState(room);
  const [busyBed, setBusyBed] = useState(null);
  const [addBusy, setAddBusy] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [assign, setAssign] = useState(null);
  const [removeBed, setRemoveBed] = useState(null);

  const reload = async () => {
    const res = await api.get(`/rooms/${detail._id}`);
    setDetail(res.data?.data);
  };

  const setStatus = async (bed, status) => {
    setBusyBed(bed._id);
    try {
      await apiPatch(`/rooms/${detail._id}/beds/${bed._id}/status`, { status });
      toast.success(`Bed set to ${status}`);
      await reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyBed(null);
    }
  };

  const addBed = async () => {
    if (!newLabel.trim()) return;
    setAddBusy(true);
    try {
      await apiPost(`/rooms/${detail._id}/beds`, { label: newLabel.trim().toUpperCase() });
      toast.success('Bed added');
      setNewLabel('');
      await reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAddBusy(false);
    }
  };

  const removeBedConfirm = async () => {
    try {
      await apiDelete(`/rooms/${detail._id}/beds/${removeBed._id}`);
      toast.success('Bed removed');
      setRemoveBed(null);
      await reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
      setRemoveBed(null);
    }
  };

  const unassign = async (bed) => {
    setBusyBed(bed._id);
    try {
      await apiPost(`/rooms/${detail._id}/beds/${bed._id}/unassign`);
      toast.success('Bed released');
      await reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyBed(null);
    }
  };

  if (!detail) return null;

  return (
    <>
      <Modal open onClose={onClose} title={`Room ${detail.roomNumber}${detail.floor ? ` · Floor ${detail.floor}` : ''}`} width="max-w-2xl" footer={
        <>
          <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => onDelete(detail)}>
            <Trash2 size={14} /> <span className="ml-1">Delete</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(detail)}>
            <Edit3 size={14} /> <span className="ml-1">Edit</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </>
      }>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={ROOM_STATUS[detail.status] || 'slate'}>{detail.status}</Badge>
            <span className="text-xs text-slate-400">{detail.roomType}</span>
            <span className="text-xs text-slate-400">Rent {formatMoney(detail.monthlyRent)}</span>
            <span className="text-xs text-slate-400">Deposit {formatMoney(detail.securityDeposit)}</span>
            {detail.facilities?.length ? (
              <span className="text-xs text-slate-400">{detail.facilities.join(', ')}</span>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Beds ({detail.beds?.length || 0})</p>
            <div className="flex items-center gap-2">
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label e.g. E" className="w-32" />
              <Button size="sm" variant="outline" loading={addBusy} onClick={addBed} icon={Plus}>Add bed</Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {detail.beds?.map((b) => (
              <div key={b._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${BED_TONE[b.status]}`}>{b.label}</span>
                  {b.student ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{b.studentName}</p>
                      <p className="text-[11px] text-slate-400">Occupied{b.assignedAt ? ` · since ${new Date(b.assignedAt).toLocaleDateString()}` : ''}</p>
                    </div>
                  ) : (
                    <span className="text-sm capitalize text-slate-400">{b.status}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {b.status !== 'occupied' ? (
                    <>
                      <Select
                        className="w-32"
                        value={b.status}
                        disabled={busyBed === b._id}
                        onChange={(e) => setStatus(b, e.target.value)}
                        options={[
                          { value: 'available', label: 'Available' },
                          { value: 'reserved', label: 'Reserved' },
                          { value: 'maintenance', label: 'Maintenance' }
                        ]}
                      />
                      <Button size="sm" variant="outline" onClick={() => setAssign(b)} icon={UserRoundPlus}>Assign</Button>
                      <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => setRemoveBed(b)}>
                        <Trash2 size={14} />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" loading={busyBed === b._id} onClick={() => unassign(b)}>Unassign</Button>
                  )}
                </div>
              </div>
            ))}
            {!detail.beds?.length ? (
              <p className="py-4 text-center text-sm text-slate-400">No beds yet. Add one above.</p>
            ) : null}
          </div>
        </div>
      </Modal>

      {assign ? (
        <AssignBed
          open={!!assign}
          room={detail}
          bed={assign}
          onClose={() => setAssign(null)}
          onDone={() => {
            reload().catch(() => {});
            onChanged();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={!!removeBed}
        title="Remove bed"
        message={`Remove bed ${removeBed?.label} from room ${detail.roomNumber}?`}
        onCancel={() => setRemoveBed(null)}
        onConfirm={removeBedConfirm}
      />
    </>
  );
};

export default function Rooms() {
  usePageTitle('Rooms & Beds');
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [floor, setFloor] = useState('all');
  const [status, setStatus] = useState('all');
  const [hostelFilter, setHostelFilter] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [floors, setFloors] = useState([]);
  const [summary, setSummary] = useState(null);

  const { data: hostelList } = useApiData(
    () => (isSuperAdmin ? api.get('/admin/hostels', { params: { limit: 100 } }).then((r) => r.data?.data?.data || []) : null),
    [isSuperAdmin]
  );

  const { data, loading, refetch } = useApiData(
    () =>
      api
        .get('/rooms', {
          params: {
            page,
            limit,
            q: debouncedQ,
            floor,
            status,
            ...(isSuperAdmin && hostelFilter ? { hostel: hostelFilter } : {})
          }
        })
        .then((r) => r.data?.data),
    [page, limit, debouncedQ, floor, status, hostelFilter, isSuperAdmin]
  );

  const loadSide = async () => {
    const params = isSuperAdmin && hostelFilter ? { hostel: hostelFilter } : {};
    const [summaryRes, floorsRes] = await Promise.all([
      api.get('/rooms/summary', { params }),
      api.get('/rooms/floors', { params })
    ]);
    setSummary(summaryRes.data?.data);
    setFloors(floorsRes.data?.data?.floors || []);
  };

  useEffect(() => {
    loadSide().catch(() => {});
  }, [hostelFilter, isSuperAdmin]);

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
      await apiDelete(`/rooms/${del._id}`);
      toast.success('Room deleted');
      setDel(null);
      refetch();
      await loadSide().catch(() => {});
    } catch (err) {
      toast.error(errorMessage(err));
      setDel(null);
    }
  };

  const stats = summary
    ? [
        { label: 'Rooms', value: summary.totalRooms },
        { label: 'Total beds', value: summary.totalBeds },
        { label: 'Occupied', value: summary.occupied, accent: 'text-slate-800 dark:text-white' },
        { label: 'Available', value: summary.available, accent: 'text-emerald-600' },
        { label: 'Occupancy', value: `${summary.occupiedPercent}%`, accent: 'text-brand-600' }
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Rooms & Beds"
        subtitle={summary ? `${summary.totalBeds} beds across ${summary.totalRooms} rooms` : 'Manage rooms and bed allocation'}
        icon={BedDouble}
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setEditing(null);
              setModal(true);
            }}
          >
            Add Room
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-0.5 text-xl font-extrabold ${s.accent || 'text-slate-900 dark:text-white'}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input value={q} onChange={onSearch} placeholder="Search room number…" className="w-full sm:w-64" />
          {isSuperAdmin ? (
            <Select
              value={hostelFilter}
              onChange={(e) => {
                setHostelFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All hostels' },
                ...(hostelList || []).map((h) => ({ value: h._id, label: h.name }))
              ]}
              className="w-48"
            />
          ) : null}
          <Select value={floor} onChange={(e) => { setFloor(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All floors' },
            ...floors.map((f) => ({ value: f, label: `Floor ${f}` }))
          ]} className="w-36" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
            { value: 'all', label: 'All statuses' },
            { value: 'available', label: 'Available' },
            { value: 'partial', label: 'Partial' },
            { value: 'full', label: 'Full' },
            { value: 'reserved', label: 'Reserved' },
            { value: 'maintenance', label: 'Maintenance' }
          ]} className="w-40" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={BedDouble}
            title="No rooms found"
            subtitle="Add your first room to start assigning beds."
            action={<Button icon={Plus} onClick={() => { setEditing(null); setModal(true); }}>Add Room</Button>}
          />
        ) : (
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((r) => (
              <button
                key={r._id}
                onClick={() => setDetail(r)}
                className="group rounded-xl border border-slate-200 p-4 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-slate-800 dark:hover:border-brand-800"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                      <DoorOpen size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Room {r.roomNumber}</p>
                      <p className="text-[11px] text-slate-400">{r.floor ? `Floor ${r.floor}` : ''} · {r.roomType} · {formatMoney(r.monthlyRent)}</p>
                      {isSuperAdmin && r.hostel?.name ? (
                        <p className="text-[11px] font-medium text-brand-600">{r.hostel.name}{r.hostel.code ? ` · ${r.hostel.code}` : ''}</p>
                      ) : null}
                    </div>
                  </div>
                  <Badge tone={ROOM_STATUS[r.status] || 'slate'}>{r.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.beds?.map((b) => (
                    <span key={b._id} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${BED_TONE[b.status]}`}>
                      {b.label}{b.student ? ` · ${b.studentName}` : ''}
                    </span>
                  ))}
                  {!r.beds?.length ? <span className="text-[11px] text-slate-400">No beds</span> : null}
                </div>
              </button>
            ))}
          </div>
        )}
        <Pagination page={page} limit={limit} total={data?.total || 0} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1); }} />
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Room' : 'Add Room'} width="max-w-xl">
        <RoomForm
          initial={editing}
          hostelId={hostelFilter}
          hostels={hostelList}
          onSaved={() => {
            setModal(false);
            refetch();
            loadSide().catch(() => {});
          }}
          onCancel={() => setModal(false)}
        />
      </Modal>

      {detail ? (
        <RoomDetail
          room={detail}
          onClose={() => setDetail(null)}
          onChanged={() => {
            refetch();
            loadSide().catch(() => {});
          }}
          onEdit={(r) => {
            setDetail(null);
            setEditing(r);
            setModal(true);
          }}
          onDelete={(r) => {
            setDetail(null);
            setDel(r);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!del}
        title="Delete room"
        message={`Delete room ${del?.roomNumber}? Occupied rooms cannot be deleted.`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}