import React, { useEffect, useState } from 'react';
import { Building2, Receipt, UtensilsCrossed } from 'lucide-react';
import api, { apiPost, apiPut, apiDelete, errorMessage, fileUrl, uploadFile } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea } from '../components/ui';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

const CURRENCIES = [
  { value: 'NPR', label: 'NPR — Nepalese Rupee' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — Pound Sterling' }
];

const WEEK_STARTS = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'saturday', label: 'Saturday' }
];

const HOSTEL_TYPES = [
  { value: 'boys', label: 'Boys' },
  { value: 'girls', label: 'Girls' },
  { value: 'mixed', label: 'Mixed' }
];

export default function Settings() {
  usePageTitle('Settings');
  const toast = useToast();

  const { data: profile, loading: profileLoading, refetch: refetchProfile } = useApiData(
    () => api.get('/hostels/profile').then((r) => r.data?.data),
    []
  );
  const { data: billing, loading: billingLoading, refetch: refetchBilling } = useApiData(
    () => api.get('/hostels/billing-settings').then((r) => r.data?.data),
    []
  );
  const { data: meals, loading: mealsLoading, refetch: refetchMeals } = useApiData(
    () => api.get('/settings/meals').then((r) => r.data?.data),
    []
  );

  const [p, setP] = useState({});
  const [b, setB] = useState({});
  const [m, setM] = useState({});
  const [busy, setBusy] = useState({ profile: false, billing: false, meals: false });

  useEffect(() => {
    if (profile) {
      const a = profile.address || {};
      setP({
        name: profile.name || '',
        type: profile.type || 'boys',
        ownerName: profile.ownerName || '',
        registrationNumber: profile.registrationNumber || '',
        email: profile.email || '',
        phone: profile.phone || '',
        altPhone: profile.altPhone || '',
        website: profile.website || '',
        description: profile.description || '',
        street: a.street || '',
        province: a.province || '',
        district: a.district || '',
        municipality: a.municipality || '',
        ward: a.ward || '',
        emergencyName: profile.emergencyContact?.name || '',
        emergencyPhone: profile.emergencyContact?.phone || '',
        rules: profile.rules || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (billing) {
      setB({
        currency: billing.currency || 'NPR',
        invoicePrefix: billing.invoicePrefix || 'INV',
        receiptPrefix: billing.receiptPrefix || 'RCP',
        dueDay: billing.dueDay ?? 5,
        lateFee: billing.lateFee ?? 0,
        weekStart: billing.weekStart || 'sunday',
        billingEmail: billing.billingEmail || '',
        invoiceFooter: billing.invoiceFooter || ''
      });
    }
  }, [billing]);

  useEffect(() => {
    if (meals) {
      setM({
        breakfast: meals.breakfast ?? 50,
        lunch: meals.lunch ?? 100,
        dinner: meals.dinner ?? 100,
        snacks: meals.snacks ?? 30
      });
    }
  }, [meals]);

  const setPField = (k) => (e) => setP((f) => ({ ...f, [k]: e.target.value }));
  const setBField = (k) => (e) => setB((f) => ({ ...f, [k]: e.target.value }));
  const setMField = (k) => (e) => setM((f) => ({ ...f, [k]: e.target.value }));

  const saveProfile = async () => {
    setBusy((s) => ({ ...s, profile: true }));
    try {
      await apiPut('/hostels/profile', {
        name: p.name,
        type: p.type,
        ownerName: p.ownerName,
        registrationNumber: p.registrationNumber,
        email: p.email,
        phone: p.phone,
        altPhone: p.altPhone,
        website: p.website,
        description: p.description,
        address: {
          street: p.street,
          province: p.province,
          district: p.district,
          municipality: p.municipality,
          ward: p.ward
        },
        emergencyContact: { name: p.emergencyName, phone: p.emergencyPhone },
        rules: p.rules
      });
      toast.success('Hostel profile updated');
      refetchProfile();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy((s) => ({ ...s, profile: false }));
    }
  };

  const saveBilling = async () => {
    setBusy((s) => ({ ...s, billing: true }));
    try {
      await apiPut('/hostels/billing-settings', {
        currency: b.currency,
        invoicePrefix: b.invoicePrefix,
        receiptPrefix: b.receiptPrefix,
        dueDay: Number(b.dueDay) || 5,
        lateFee: Number(b.lateFee) || 0,
        weekStart: b.weekStart,
        billingEmail: b.billingEmail,
        invoiceFooter: b.invoiceFooter
      });
      toast.success('Billing settings updated');
      refetchBilling();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy((s) => ({ ...s, billing: false }));
    }
  };

  const saveMeals = async () => {
    setBusy((s) => ({ ...s, meals: true }));
    try {
      await apiPut('/settings/meals', {
        breakfast: Number(m.breakfast) || 0,
        lunch: Number(m.lunch) || 0,
        dinner: Number(m.dinner) || 0,
        snacks: Number(m.snacks) || 0
      });
      toast.success('Meal prices updated');
      refetchMeals();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy((s) => ({ ...s, meals: false }));
    }
  };

  const loading = profileLoading || billingLoading || mealsLoading;

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-brand-600"><Spinner size={28} /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Hostel profile, billing and meal configuration" icon={Building2} />

      <Card>
        <div className="card-header">
          <h3 className="text-sm font-bold flex items-center gap-2"><Building2 size={15} className="text-brand-500" /> Hostel Profile</h3>
        </div>
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Hostel name *" value={p.name || ''} onChange={setPField('name')} />
            <Select label="Type" value={p.type || 'boys'} onChange={setPField('type')} options={HOSTEL_TYPES} />
            <Input label="Owner name" value={p.ownerName || ''} onChange={setPField('ownerName')} />
            <Input label="Registration number" value={p.registrationNumber || ''} onChange={setPField('registrationNumber')} />
            <Input label="Email" type="email" value={p.email || ''} onChange={setPField('email')} />
            <Input label="Phone" value={p.phone || ''} onChange={setPField('phone')} />
            <Input label="Alt phone" value={p.altPhone || ''} onChange={setPField('altPhone')} />
            <Input label="Website" value={p.website || ''} onChange={setPField('website')} />
            <Input label="Address — street" value={p.street || ''} onChange={setPField('street')} />
            <Input label="Address — district" value={p.district || ''} onChange={setPField('district')} />
            <Input label="Address — municipality" value={p.municipality || ''} onChange={setPField('municipality')} />
            <Input label="Address — province / ward" value={p.province || ''} onChange={setPField('province')} />
            <Input label="Ward" value={p.ward || ''} onChange={setPField('ward')} />
            <Input label="Emergency contact name" value={p.emergencyName || ''} onChange={setPField('emergencyName')} />
            <Input label="Emergency contact phone" value={p.emergencyPhone || ''} onChange={setPField('emergencyPhone')} />
          </div>
          <div className="mt-3 space-y-3">
            <Textarea label="Description" value={p.description || ''} onChange={setPField('description')} />
            <Textarea label="House rules" value={p.rules || ''} onChange={setPField('rules')} />
          </div>
          <div className="mt-4 flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button loading={busy.profile} icon={null} onClick={saveProfile}>Save profile</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="card-header">
          <h3 className="text-sm font-bold flex items-center gap-2"><Receipt size={15} className="text-brand-500" /> Billing Settings</h3>
        </div>
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Currency" value={b.currency || 'NPR'} onChange={setBField('currency')} options={CURRENCIES} />
            <Select label="Week starts on" value={b.weekStart || 'sunday'} onChange={setBField('weekStart')} options={WEEK_STARTS} />
            <Input label="Invoice prefix" value={b.invoicePrefix || 'INV'} onChange={setBField('invoicePrefix')} />
            <Input label="Receipt prefix" value={b.receiptPrefix || 'RCP'} onChange={setBField('receiptPrefix')} />
            <Input label="Rent due day of month" type="number" min="1" max="31" value={b.dueDay ?? 5} onChange={setBField('dueDay')} />
            <Input label="Late fee (per invoice)" type="number" min="0" value={b.lateFee ?? 0} onChange={setBField('lateFee')} />
            <Input label="Billing email" type="email" value={b.billingEmail || ''} onChange={setBField('billingEmail')} className="sm:col-span-2" />
            <Input label="Invoice footer" value={b.invoiceFooter || ''} onChange={setBField('invoiceFooter')} className="sm:col-span-2" hint="Shown at the bottom of every invoice, e.g. bank details." />
          </div>
          <div className="mt-4 flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button loading={busy.billing} icon={null} onClick={saveBilling}>Save billing settings</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="card-header">
          <h3 className="text-sm font-bold flex items-center gap-2"><UtensilsCrossed size={15} className="text-brand-500" /> Meal Prices</h3>
        </div>
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Breakfast (Rs.)" type="number" min="0" value={m.breakfast ?? 50} onChange={setMField('breakfast')} />
            <Input label="Lunch (Rs.)" type="number" min="0" value={m.lunch ?? 100} onChange={setMField('lunch')} />
            <Input label="Dinner (Rs.)" type="number" min="0" value={m.dinner ?? 100} onChange={setMField('dinner')} />
            <Input label="Snacks (Rs.)" type="number" min="0" value={m.snacks ?? 30} onChange={setMField('snacks')} />
          </div>
          <div className="mt-4 flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button loading={busy.meals} icon={null} onClick={saveMeals}>Save meal prices</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}