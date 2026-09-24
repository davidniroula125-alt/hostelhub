import React, { useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2 } from 'lucide-react';
import api, { apiPost, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, Spinner } from '../components/ui';
import { formatDate } from '../utils/format';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STATUS_TONE = { present: 'green', absent: 'red', late: 'amber', leave: 'blue' };
const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'leave', label: 'Leave' }
];

export default function Attendance() {
  usePageTitle('Attendance');
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: studentsData, loading: loadingStudents } = useApiData(
    () => api.get('/students', { params: { status: 'active', limit: 100 } }).then((r) => r.data?.data),
    []
  );

  const { data: attData, loading: loadingAtt, refetch } = useApiData(
    () => api.get('/attendance', { params: { date, limit: 100 } }).then((r) => r.data?.data),
    [date]
  );

  const students = useMemo(() => studentsData?.data || [], [studentsData]);

  const attMap = useMemo(() => {
    const m = {};
    (attData?.data || []).forEach((a) => {
      if (a.student?._id) m[a.student._id] = a.status;
    });
    return m;
  }, [attData]);

  const currentMarks = useMemo(() => {
    const m = {};
    students.forEach((s) => {
      m[s._id] = marks[s._id] ?? attMap[s._id] ?? 'present';
    });
    return m;
  }, [students, marks, attMap]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0 };
    students.forEach((s) => {
      c[currentMarks[s._id]] += 1;
    });
    return c;
  }, [students, currentMarks]);

  const setAll = (status) => {
    const m = {};
    students.forEach((s) => {
      m[s._id] = status;
    });
    setMarks(m);
  };
  const setOne = (id, status) => setMarks((m) => ({ ...m, [id]: status }));

  const save = async () => {
    if (!students.length) return;
    setSaving(true);
    try {
      const records = students.map((s) => ({ student: s._id, status: currentMarks[s._id] }));
      await apiPost('/attendance/bulk', { date, records });
      toast.success('Attendance saved');
      setMarks({});
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingStudents || loadingAtt;

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={`Mark daily attendance · ${formatDate(date)}`}
        icon={CalendarCheck}
        actions={<Button icon={CheckCircle2} loading={saving} onClick={save}>Save attendance</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-slate-400">Present</p>
          <p className="mt-1 text-lg font-extrabold text-emerald-600">{counts.present}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-400">Absent</p>
          <p className="mt-1 text-lg font-extrabold text-rose-600">{counts.absent}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-400">Late</p>
          <p className="mt-1 text-lg font-extrabold text-amber-600">{counts.late}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-400">On leave</p>
          <p className="mt-1 text-lg font-extrabold text-blue-600">{counts.leave}</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setMarks({}); }} className="w-full sm:w-44" />
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setAll('present')}>All present</Button>
            <Button variant="outline" size="sm" onClick={() => setAll('absent')}>All absent</Button>
            <Button variant="outline" size="sm" onClick={() => setAll('late')}>All late</Button>
            <Button variant="outline" size="sm" onClick={() => setAll('leave')}>All leave</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !students.length ? (
          <EmptyState
            icon={CalendarCheck}
            title="No active students"
            subtitle="Add active students to start marking attendance."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Room / Bed</th>
                  <th className="w-48">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</p>
                      <p className="text-[11px] text-slate-400">{s.studentId || ''}</p>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {s.room?.roomNumber ? `${s.room.roomNumber} · ${s.bedLabel || ''}` : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Select
                          value={currentMarks[s._id]}
                          onChange={(e) => setOne(s._id, e.target.value)}
                          options={STATUS_OPTIONS}
                          className="w-36"
                        />
                        <Badge tone={STATUS_TONE[currentMarks[s._id]] || 'slate'}>{currentMarks[s._id]}</Badge>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}