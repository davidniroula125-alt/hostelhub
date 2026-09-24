import React, { useMemo } from 'react';
import { CalendarRange, Check, CreditCard, Sparkles, Users } from 'lucide-react';
import api, { apiPost, apiPut, apiDelete, errorMessage, fileUrl, uploadFile } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../components/ui';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

const STATUS_TONE = {
  trial: 'amber',
  active: 'green',
  expired: 'red',
  cancelled: 'slate',
  suspended: 'red'
};

const METHOD_TONE = {
  cash: 'slate',
  bank: 'blue',
  esewa: 'green',
  khalti: 'green',
  card: 'indigo',
  other: 'slate'
};

const limitLabel = (n) => (n < 0 ? 'Unlimited' : String(n));

export default function Subscription() {
  usePageTitle('Subscription');

  const { data, loading, error, refetch } = useApiData(
    () => api.get('/hostels/subscription').then((r) => r.data?.data),
    []
  );

  const subscription = data?.subscription || null;
  const hostel = data?.hostel || null;
  const plan = subscription?.plan || null;

  const limits = useMemo(
    () => [
      { label: 'Max students', value: limitLabel(plan?.maxStudents), icon: Users },
      { label: 'Max branches', value: limitLabel(plan?.maxBranches) },
      { label: 'Trial days', value: plan ? limitLabel(plan.trialDays) : '—' },
      { label: 'Monthly price', value: plan ? formatMoney(plan.priceMonthly) : '—' },
      { label: 'Yearly price', value: plan ? formatMoney(plan.priceYearly) : '—' },
      { label: 'Billing cycle', value: subscription?.endDate ? formatDate(subscription.endDate) : '—' }
    ],
    [plan, subscription]
  );

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-brand-600"><Spinner size={28} /></div>;
  }

  if (error || (!subscription && !hostel)) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No active subscription"
        subtitle="Your hostel does not have a subscription record yet. Contact the HostelHub team to set one up."
        action={<Button variant="outline" onClick={refetch}>Refresh</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscription"
        subtitle="Your current plan and usage limits"
        icon={CreditCard}
        actions={
          <Button variant="outline" onClick={refetch}>Refresh</Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-brand-600 to-brand-500 p-6 text-white dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{plan?.name || 'HostelHub Plan'}</h2>
              <p className="text-sm text-white/80">
                {plan?.code ? `Code ${plan.code} · ` : ''}
                {subscription ? (
                  <>
                    Since {formatDate(subscription.startDate)} · {hostel?.status || ''}
                  </>
                ) : (
                  hostel?.status || ''
                )}
              </p>
            </div>
          </div>
          {subscription ? <Badge tone={STATUS_TONE[subscription.status] || 'slate'}>{subscription.status}</Badge> : null}
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {limits.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                {Icon ? <Icon size={16} /> : <Check size={16} />}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="card-header"><h3 className="text-sm font-bold">Subscription Details</h3></div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
            {[
              ['Status', subscription ? <Badge tone={STATUS_TONE[subscription.status] || 'slate'}>{subscription.status}</Badge> : '—'],
              ['Plan', plan?.name || '—'],
              ['Started', formatDate(subscription?.startDate)],
              ['Ends', subscription?.endDate ? formatDate(subscription.endDate) : '—'],
              ['Amount', subscription ? formatMoney(subscription.amount) : '—'],
              ['Method', subscription?.method ? <Badge tone={METHOD_TONE[subscription.method] || 'slate'}>{subscription.method}</Badge> : '—'],
              ['Paid at', formatDateTime(subscription?.paidAt)],
              ['Trial ends', formatDate(subscription?.trialEndsAt || hostel?.trialEndsAt)]
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
                <p className="mt-0.5 text-slate-700 dark:text-slate-300">{v}</p>
              </div>
            ))}
          </div>
          {subscription?.notes ? (
            <div className="border-t border-slate-100 p-4 text-sm text-slate-500 dark:border-slate-800">{subscription.notes}</div>
          ) : null}
        </Card>

        <Card>
          <div className="card-header">
            <h3 className="text-sm font-bold">Plan Features</h3>
            <span className="flex items-center gap-1 text-xs text-slate-400"><CalendarRange size={13} /> {plan?.name || 'Current plan'}</span>
          </div>
          {!plan?.features?.length ? (
            <EmptyState icon={Sparkles} title="No features listed" subtitle={`${plan?.name || 'This'} plan has not declared any features.`} />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <Check size={12} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="card-header">
          <h3 className="text-sm font-bold">Hostel Status</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Hostel</p>
            <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{hostel?.name || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Status</p>
            <p className="mt-0.5"><Badge tone={hostel?.status === 'active' ? 'green' : hostel?.status === 'trial' ? 'amber' : 'red'}>{hostel?.status || '—'}</Badge></p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Trial ends at</p>
            <p className="mt-0.5 text-slate-700 dark:text-slate-300">{formatDateTime(hostel?.trialEndsAt)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Assigned plan</p>
            <p className="mt-0.5 text-slate-700 dark:text-slate-300">{plan?.name || '—'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}