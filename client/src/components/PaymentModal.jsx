import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Button, Input, Modal, Select } from './ui';

export default function PaymentModal({ open, onClose, studentId, invoiceId, invoiceBalance, studentName, onPaid }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(invoiceBalance != null ? String(invoiceBalance) : '');
      setMethod('cash');
      setReference('');
      setDate(new Date().toISOString().slice(0, 10));
      setNote('');
    }
  }, [open, invoiceBalance]);

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return toast.error('Enter a valid amount');
    setBusy(true);
    try {
      const body = { studentId, amount: Number(amount), method, reference, notes: note };
      if (invoiceId) body.invoiceId = invoiceId;
      if (date) body.date = date;
      await api.post('/billing/payments', body);
      toast.success('Payment recorded');
      onPaid?.();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Receive Payment${studentName ? ` · ${studentName}` : ''}`} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={busy} onClick={submit}>Record payment</Button>
      </>
    }>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
          <p className="text-xs text-slate-400">{invoiceId ? 'Invoice balance' : 'Outstanding balance'}</p>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">
            {Number(invoiceBalance ?? 0).toLocaleString('en-IN')}
          </p>
        </div>
        <Input label="Amount (Rs.) *" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'bank', label: 'Bank transfer' },
              { value: 'esewa', label: 'eSewa' },
              { value: 'khalti', label: 'Khalti' },
              { value: 'fonepay', label: 'FonePay' },
              { value: 'card', label: 'Card' }
            ]}
          />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Input label="Reference / transaction ID" value={reference} onChange={(e) => setReference(e.target.value)} />
        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      </form>
    </Modal>
  );
}