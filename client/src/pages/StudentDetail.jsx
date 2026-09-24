import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, CreditCard, Edit3, FileText,
  GraduationCap, MapPin, Phone, Receipt, ShieldAlert, UserCheck, Wallet
} from 'lucide-react';
import api, { errorMessage, fileUrl } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, EmptyState, Skeleton, Spinner } from '../components/ui';
import PaymentModal from '../components/PaymentModal';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';
import { Download } from 'lucide-react';
import { downloadCsv } from '../utils/format';

const TABS = [
  { key: 'overview', label: 'Overview', icon: UserCheck },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'attendance', label: 'Attendance', icon: CalendarDays },
  { key: 'complaints', label: 'Complaints', icon: AlertCircle },
  { key: 'leaves', label: 'Leaves', icon: GraduationCap },
  { key: 'visitors', label: 'Visitors', icon: UserCheck },
  { key: 'documents', label: 'Documents', icon: FileText }
];

const STATUS_TONE = { active: 'green', notice: 'amber', checkedout: 'slate', suspended: 'red' };
const INV_TONE = { open: 'amber', paid: 'green', partial: 'blue', void: 'slate' };
const ATT_TONE = { present: 'green', absent: 'red', late: 'amber', leave: 'blue' };
const VISITOR_ACTION_TONE = { pending: 'amber', checked_in: 'green', completed: 'slate' };

export default function StudentDetail() {
  usePageTitle('Student Profile');
  const { id } = useParams();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [payOpen, setPayOpen] = useState(false);

  const { data, loading, error, refetch } = useApiData(
    () => api.get(`/students/${id}`).then((r) => r.data?.data),
    [id]
  );

  if (loading) return <div className="flex h-64 items-center justify-center text-brand-600"><Spinner size={28} /></div>;
  if (error || !data) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Student not found"
        subtitle={error}
        action={<Button variant="outline" onClick={() => (window.location.href = '/students')}><ArrowLeft size={15} /> Back to students</Button>}
      />
    );
  }

  const s = data;

  const exportInvoices = () =>
    downloadCsv('invoices.csv', s.invoices.map((i) => ({
      Number: i.invoiceNumber,
      Period: i.period,
      Total: i.total,
      Paid: i.paid,
      Balance: i.balance,
      Status: i.status,
      Due: i.dueDate
    })));

  const openInvoice = s.invoices.find((i) => ['open', 'partial'].includes(i.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/students')}>
          <ArrowLeft size={15} /> Students
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {s.photo ? (
            <img src={fileUrl(s.photo)} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-xl font-extrabold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {s.name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{s.name}</h2>
              <Badge tone={STATUS_TONE[s.status] || 'slate'}>{s.status}</Badge>
              {s.studentId ? <Badge tone="indigo">{s.studentId}</Badge> : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><Phone size={13} /> {s.phone || '—'}</span>
              <span className="flex items-center gap-1"><MapPin size={13} /> {s.permanentAddress || '—'}</span>
              <span className="flex items-center gap-1">
                <ShieldAlert size={13} />
                Room {s.room?.roomNumber ? `${s.room.roomNumber} · ${s.bedLabel || ''}` : '—'} (not assigned)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {openInvoice ? (
              <Button icon={CreditCard} onClick={() => setPayOpen(true)}>
                Receive payment
              </Button>
            ) : null}
            <Button variant="outline" icon={Edit3} onClick={() => (window.location.href = `/students`)}>
              Edit
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-400">Monthly Rent</p>
          <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{formatMoney(s.monthlyRent)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-400">Outstanding</p>
          <p className={`mt-1 text-base font-extrabold ${s.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatMoney(s.outstandingBalance)}
          </p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-400">Security Deposit</p>
          <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{formatMoney(s.securityDeposit)}</p>
          {s.deposit?.refundStatus && s.deposit.refundStatus !== 'none' ? (
            <p className="mt-0.5 text-[10px] text-slate-400">{s.deposit.refundStatus}</p>
          ) : null}
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-400">Admitted</p>
          <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{formatDate(s.admissionDate)}</p>
        </Card>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === key ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="card-header"><h3 className="text-sm font-bold">Profile</h3></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
              {[
                ['Gender', s.gender],
                ['Date of birth', formatDate(s.dob)],
                ['Nationality', s.nationality],
                ['Citizenship No.', s.citizenshipNumber || '—'],
                ['College', s.college || '—'],
                ['Course', s.course || '—'],
                ['Level', s.level || '—'],
                ['Email', s.email || '—'],
                ['Current address', s.currentAddress || '—'],
                ['Food plan', s.foodPlan?.name || '—'],
                ['Food amount', s.foodAmount ? formatMoney(s.foodAmount) : '—']
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
                  <p className="mt-0.5 text-slate-700 dark:text-slate-300">{v || '—'}</p>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card>
              <div className="card-header"><h3 className="text-sm font-bold">Guardian</h3></div>
              <div className="p-4 text-sm">
                <p className="font-semibold text-slate-800 dark:text-slate-200">{s.guardian?.name || '—'}</p>
                <p className="text-xs text-slate-400">
                  {s.guardian?.relationship ? `${s.guardian.relationship} · ` : ''}{s.guardian?.phone || ''}
                </p>
                <p className="mt-2 text-xs text-slate-400">{s.guardian?.address || 'No address on file'}</p>
              </div>
            </Card>
            <Card>
              <div className="card-header"><h3 className="text-sm font-bold">Emergency Contact</h3></div>
              <div className="p-4 text-sm">
                <p className="font-semibold text-slate-800 dark:text-slate-200">{s.emergency?.name || '—'}</p>
                <p className="text-xs text-slate-400">{s.emergency?.relationship || ''} · {s.emergency?.phone || '—'}</p>
              </div>
            </Card>
            <Card>
              <div className="card-header"><h3 className="text-sm font-bold">Notes</h3></div>
              <div className="p-4 text-sm text-slate-600 dark:text-slate-300">{s.notes || 'No notes'}</div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'invoices' ? (
        <Card>
          <div className="card-header">
            <h3 className="text-sm font-bold">Invoices</h3>
            <button onClick={exportInvoices} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
              <Download size={13} /> Export
            </button>
          </div>
          {!s.invoices?.length ? <EmptyState icon={Receipt} title="No invoices yet" /> : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr><th>Number</th><th>Period</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Balance</th><th>Status</th><th className="text-right">Due</th></tr>
                </thead>
                <tbody>
                  {s.invoices.map((i) => (
                    <tr key={i._id}>
                      <td className="font-mono text-xs">{i.invoiceNumber}</td>
                      <td>{i.period}</td>
                      <td className="text-right">{formatMoney(i.total)}</td>
                      <td className="text-right text-emerald-600">{formatMoney(i.paid)}</td>
                      <td className={`text-right font-semibold ${i.balance > 0 ? 'text-rose-600' : ''}`}>{formatMoney(i.balance)}</td>
                      <td><Badge tone={INV_TONE[i.status]}>{i.status}</Badge></td>
                      <td className="text-right">{formatDate(i.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'payments' ? (
        <Card>
          <div className="card-header"><h3 className="text-sm font-bold">Payments</h3></div>
          {!s.payments?.length ? <EmptyState icon={Wallet} title="No payments yet" /> : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr><th>Receipt</th><th>Date</th><th>Method</th><th className="text-right">Amount</th><th>Invoice</th></tr>
                </thead>
                <tbody>
                  {s.payments.map((p) => (
                    <tr key={p._id}>
                      <td className="font-mono text-xs">{p.receiptNumber}</td>
                      <td>{formatDate(p.date)}</td>
                      <td><Badge tone="blue">{p.method}</Badge></td>
                      <td className="text-right font-semibold text-emerald-600">{formatMoney(p.amount)}</td>
                      <td>{p.invoiceNumber || 'Deposit'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'attendance' ? (
        <Card>
          <div className="card-header"><h3 className="text-sm font-bold">Recent Attendance</h3></div>
          {!s.attendance?.length ? <EmptyState icon={CalendarDays} title="No attendance records" /> : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {s.attendance.map((a) => (
                    <tr key={a._id}>
                      <td>{formatDate(a.date)}</td>
                      <td><Badge tone={ATT_TONE[a.status] || 'slate'}>{a.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'complaints' ? (
        <Card>
          <div className="card-header"><h3 className="text-sm font-bold">Complaints</h3></div>
          {!s.complaints?.length ? <EmptyState icon={AlertCircle} title="No complaints" /> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {s.complaints.map((c) => (
                <div key={c._id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.title}</p>
                    <p className="text-xs text-slate-400">{c.description}</p>
                  </div>
                  <Badge tone={c.status === 'resolved' ? 'green' : c.status === 'open' ? 'amber' : 'blue'}>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'leaves' ? (
        <Card>
          <div className="card-header"><h3 className="text-sm font-bold">Leave Requests</h3></div>
          {!s.leaves?.length ? <EmptyState icon={GraduationCap} title="No leave requests" /> : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>From</th><th>To</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {s.leaves.map((l) => (
                    <tr key={l._id}>
                      <td>{formatDate(l.startDate)}</td>
                      <td>{formatDate(l.endDate)}</td>
                      <td>{l.reason}</td>
                      <td><Badge tone={l.status === 'approved' ? 'green' : l.status === 'pending' ? 'amber' : 'red'}>{l.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'visitors' ? (
        <Card>
          <div className="card-header"><h3 className="text-sm font-bold">Visitors</h3></div>
          {!s.visitors?.length ? <EmptyState icon={UserCheck} title="No visitors" /> : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Visitor</th><th>Entry</th><th>Status</th></tr></thead>
                <tbody>
                  {s.visitors.map((v) => (
                    <tr key={v._id}>
                      <td className="font-semibold text-slate-800 dark:text-slate-200">{v.name}</td>
                      <td>{formatDateTime(v.entryTime)}</td>
                      <td><Badge tone={VISITOR_ACTION_TONE[v.status] || 'slate'}>{v.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'documents' ? (
        <Card>
          <div className="card-header"><h3 className="text-sm font-bold">Documents</h3></div>
          {!s.documents?.length ? <EmptyState icon={FileText} title="No documents" /> : (
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {s.documents.map((d) => (
                <a key={d._id} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                  <FileText size={18} className="text-brand-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{d.title || d.filename}</p>
                    <p className="text-xs text-slate-400">{d.category} · {formatDate(d.createdAt)}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        studentId={s._id}
        invoiceId={openInvoice?._id}
        invoiceBalance={openInvoice?.balance}
        studentName={s.name}
        onPaid={refetch}
      />
    </div>
  );
}