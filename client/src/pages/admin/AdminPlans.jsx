import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Sparkles, Trash2 } from 'lucide-react';
import api, { apiDelete, apiPost, apiPut, errorMessage } from '../../api/client';
import { usePageTitle } from '../../components/Layout';
import { useApiData } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, Spinner } from '../../components/ui';
import { formatMoney } from '../../utils/format';

const PlanForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    code: initial?.code || '',
    priceMonthly: initial?.priceMonthly ?? '',
    priceYearly: initial?.priceYearly ?? '',
    maxStudents: initial?.maxStudents ?? '',
    maxBranches: initial?.maxBranches ?? '',
    trialDays: initial?.trialDays ?? '',
    sortOrder: initial?.sortOrder ?? 0,
    active: initial?.active ?? true,
    features: (initial?.features || []).join('\n')
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Plan name is required');
    if (form.priceMonthly === '') return toast.error('Monthly price is required');
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        priceMonthly: Number(form.priceMonthly),
        priceYearly: form.priceYearly !== '' ? Number(form.priceYearly) : undefined,
        maxStudents: form.maxStudents !== '' ? Number(form.maxStudents) : undefined,
        maxBranches: form.maxBranches !== '' ? Number(form.maxBranches) : undefined,
        trialDays: form.trialDays !== '' ? Number(form.trialDays) : undefined,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active === 'true' || form.active === true,
        features: form.features.split('\n').map((f) => f.trim()).filter(Boolean)
      };
      if (initial?._id) {
        await apiPut(`/admin/plans/${initial._id}`, payload);
        toast.success('Plan updated');
      } else {
        await apiPost('/admin/plans', payload);
        toast.success('Plan created');
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
        <Input label="Name *" value={form.name} onChange={set('name')} placeholder="e.g. Premium" />
        <Input label="Code" value={form.code} onChange={set('code')} placeholder="e.g. PREMIUM" />
        <Input label="Price / month *" type="number" min="0" value={form.priceMonthly} onChange={set('priceMonthly')} />
        <Input label="Price / year" type="number" min="0" value={form.priceYearly} onChange={set('priceYearly')} />
        <Input label="Max students" type="number" min="-1" value={form.maxStudents} onChange={set('maxStudents')} hint="Use -1 for unlimited" />
        <Input label="Max branches" type="number" min="1" value={form.maxBranches} onChange={set('maxBranches')} />
        <Input label="Trial days" type="number" min="0" value={form.trialDays} onChange={set('trialDays')} />
        <Input label="Sort order" type="number" value={form.sortOrder} onChange={set('sortOrder')} />
        <Select
          label="Active"
          value={String(form.active)}
          onChange={set('active')}
          className="sm:col-span-2"
          options={[
            { value: 'true', label: 'Active / published' },
            { value: 'false', label: 'Disabled / hidden' }
          ]}
        />
      </div>
      <div>
        <label className="label">Features (one per line)</label>
        <textarea
          className="input min-h-[110px]"
          value={form.features}
          onChange={set('features')}
          placeholder={'Unlimited students\n24/7 support\nCustom branding'}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button loading={busy} type="submit">{initial?._id ? 'Save changes' : 'Create plan'}</Button>
      </div>
    </form>
  );
};

export default function AdminPlans() {
  usePageTitle('Subscription Plans');
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, refetch } = useApiData(() => api.get('/admin/plans').then((r) => r.data?.data), []);
  const plans = useMemo(() => data || [], [data]);

  const remove = async () => {
    setBusy(true);
    try {
      await apiDelete(`/admin/plans/${del._id}`);
      toast.success('Plan deleted');
      setDel(null);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setDel(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Subscription Plans"
        subtitle={`${plans.length} plans configured`}
        icon={Sparkles}
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setEditing(null);
              setModal(true);
            }}
          >
            New Plan
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
      ) : !plans.length ? (
        <Card>
          <EmptyState icon={Sparkles} title="No plans yet" subtitle="Create your first subscription plan." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <Card key={p._id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2 p-4 pb-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{p.name}</h3>
                    {p.code ? <Badge tone="indigo">{p.code}</Badge> : null}
                    {!p.active ? <Badge tone="slate">disabled</Badge> : null}
                  </div>
                  <p className="mt-1 text-2xl font-extrabold text-brand-600 dark:text-brand-400">{formatMoney(p.priceMonthly)}<span className="text-xs font-medium text-slate-400">/mo</span></p>
                  {p.priceYearly ? <p className="text-xs text-slate-400">{formatMoney(p.priceYearly)}/yr</p> : null}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(p);
                      setModal(true);
                    }}
                  >
                    <Edit3 size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    onClick={() => setDel(p)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                <Badge tone="blue">{p.maxStudents === -1 ? 'Unlimited students' : `${p.maxStudents} students`}</Badge>
                <Badge tone="amber">{`${p.maxBranches} branch${p.maxBranches === 1 ? '' : 'es'}`}</Badge>
                <Badge tone="slate">{`${p.trialDays} day trial`}</Badge>
              </div>
              <ul className="flex-1 space-y-1.5 px-4 pb-4 pt-1">
                {(p.features || []).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="mt-0.5 text-brand-500">•</span> {f}
                  </li>
                ))}
                {!(p.features || []).length ? (
                  <li className="text-xs text-slate-400">No features listed</li>
                ) : null}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Plan' : 'New Plan'}
        width="max-w-xl"
      >
        <PlanForm
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
        title="Delete plan"
        message={`Delete ${del?.name}? Plans with active subscriptions cannot be deleted.`}
        loading={busy}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}