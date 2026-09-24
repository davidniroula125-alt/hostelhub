import React, { useMemo, useState } from 'react';
import { ArrowUpFromLine, Boxes, Edit3, Plus, ScrollText, Trash2 } from 'lucide-react';
import api, { apiDelete, apiPost, apiPut, errorMessage } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner, Textarea } from '../components/ui';
import { formatDateTime, formatMoney } from '../utils/format';

const TABS = [
  { key: 'items', label: 'Items', icon: Boxes },
  { key: 'transactions', label: 'Transactions', icon: ScrollText }
];

const TX_TONE = { in: 'green', out: 'red', adjust: 'amber', opening: 'blue' };

const ItemForm = ({ initial, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const edit = !!initial?._id;
  const [form, setForm] = useState({
    product: initial?.product || '',
    category: initial?.category || 'other',
    quantity: initial?.quantity ?? 0,
    unit: initial?.unit || 'pcs',
    purchasePrice: initial?.purchasePrice ?? '',
    supplier: initial?.supplier || '',
    location: initial?.location || '',
    lowStockThreshold: initial?.lowStockThreshold ?? 0
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.product.trim()) return toast.error('Product name is required');
    setBusy(true);
    try {
      const payload = {
        product: form.product,
        category: form.category,
        unit: form.unit,
        purchasePrice: form.purchasePrice !== '' ? Number(form.purchasePrice) : undefined,
        supplier: form.supplier,
        location: form.location,
        lowStockThreshold: form.lowStockThreshold !== '' ? Number(form.lowStockThreshold) : 0
      };
      if (!edit && form.quantity !== '') payload.quantity = Number(form.quantity);
      if (edit) await apiPut(`/inventory/${initial._id}`, payload);
      else await apiPost('/inventory', payload);
      toast.success(edit ? 'Item updated' : 'Item added');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Product *" value={form.product} onChange={set('product')} placeholder="e.g. Rice (25kg)" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Category" value={form.category} onChange={set('category')} placeholder="e.g. groceries, toiletries…" />
        <Input label="Unit" value={form.unit} onChange={set('unit')} placeholder="pcs, kg, ltr…" />
        {!edit ? <Input label="Opening quantity" type="number" min="0" value={form.quantity} onChange={set('quantity')} /> : null}
        <Input label="Purchase price (Rs)" type="number" min="0" value={form.purchasePrice} onChange={set('purchasePrice')} />
        <Input label="Supplier" value={form.supplier} onChange={set('supplier')} />
        <Input label="Location" value={form.location} onChange={set('location')} placeholder="e.g. Store room A" />
        <Input label="Low stock threshold" type="number" min="0" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">{edit ? 'Save changes' : 'Add item'}</Button>
      </div>
    </form>
  );
};

const AdjustForm = ({ item, onSaved, onCancel }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ type: 'in', quantity: '', reason: '', cost: '' });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.quantity === '' || Number(form.quantity) <= 0) return toast.error('Valid positive quantity is required');
    setBusy(true);
    try {
      const payload = { type: form.type, quantity: Number(form.quantity) };
      if (form.reason.trim()) payload.reason = form.reason.trim();
      if (form.cost !== '') payload.cost = Number(form.cost);
      await apiPost(`/inventory/${item._id}/adjust`, payload);
      toast.success('Stock updated');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        {item.product} · current stock: <span className="font-bold">{item.quantity} {item.unit}</span>
      </p>
      <Select
        label="Type"
        value={form.type}
        onChange={set('type')}
        options={[
          { value: 'in', label: 'Stock in (add)' },
          { value: 'out', label: 'Stock out (remove)' },
          { value: 'adjust', label: 'Set quantity (override)' }
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={form.type === 'adjust' ? 'New quantity *' : 'Quantity *'}
          type="number"
          min="0"
          value={form.quantity}
          onChange={set('quantity')}
        />
        <Input label="Cost (Rs)" type="number" min="0" value={form.cost} onChange={set('cost')} />
      </div>
      <Textarea label="Reason" value={form.reason} onChange={set('reason')} placeholder="e.g. Weekly grocery purchase" />
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button loading={busy} type="submit">Save</Button>
      </div>
    </form>
  );
};

export default function Inventory() {
  usePageTitle('Inventory');
  const toast = useToast();
  const [tab, setTab] = useState('items');

  const [itemPage, setItemPage] = useState(1);
  const [itemQ, setItemQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [category, setCategory] = useState('all');
  const [lowStock, setLowStock] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [itemEditing, setItemEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [itemDel, setItemDel] = useState(null);

  const [txPage, setTxPage] = useState(1);
  const [txItem, setTxItem] = useState('');

  const items = useApiData(
    () => api.get('/inventory', { params: { page: itemPage, limit: 20, q: debouncedQ, category, lowStock: lowStock ? 'true' : '' } }).then((r) => r.data?.data),
    [itemPage, debouncedQ, category, lowStock]
  );
  const transactions = useApiData(
    () => api.get('/inventory/transactions', { params: { page: txPage, limit: 20, inventory: txItem } }).then((r) => r.data?.data),
    [txPage, txItem]
  );

  const itemList = useMemo(() => items.data?.data || [], [items.data]);
  const txList = useMemo(() => transactions.data?.data || [], [transactions.data]);

  const onSearch = (e) => {
    setItemQ(e.target.value);
    clearTimeout(onSearch.t);
    onSearch.t = setTimeout(() => {
      setDebouncedQ(e.target.value);
      setItemPage(1);
    }, 350);
  };

  const removeItem = async () => {
    try {
      await apiDelete(`/inventory/${itemDel._id}`);
      toast.success('Item deleted');
      setItemDel(null);
      items.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setItemDel(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Track stock items and movements"
        icon={Boxes}
        actions={
          tab === 'items'
            ? <Button icon={Plus} onClick={() => { setItemEditing(null); setItemOpen(true); }}>Add item</Button>
            : null
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
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

      {tab === 'items' ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
            <Input value={itemQ} onChange={onSearch} placeholder="Search items…" className="w-full sm:w-56" />
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setItemPage(1); }} />
              Low stock only
            </label>
          </div>
          {items.loading ? (
            <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
          ) : !itemList.length ? (
            <EmptyState
              icon={Boxes}
              title="No items found"
              subtitle="Add an inventory item, or adjust the filters."
              action={<Button icon={Plus} onClick={() => { setItemEditing(null); setItemOpen(true); }}>Add item</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th className="text-right">Stock</th>
                    <th className="text-right">Price</th>
                    <th>Stock level</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {itemList.map((it) => {
                    const low = it.lowStockThreshold > 0 && it.quantity <= it.lowStockThreshold;
                    return (
                      <tr key={it._id}>
                        <td>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{it.product}</p>
                          {it.supplier ? <p className="text-[11px] text-slate-400">{it.supplier}</p> : null}
                        </td>
                        <td><Badge tone="indigo">{it.category}</Badge></td>
                        <td className="text-slate-600 dark:text-slate-300">{it.location || '—'}</td>
                        <td className="text-right font-semibold">{it.quantity} {it.unit}</td>
                        <td className="text-right">{formatMoney(it.purchasePrice)}</td>
                        <td><Badge tone={low ? 'red' : 'green'}>{low ? `Low (threshold ${it.lowStockThreshold})` : 'OK'}</Badge></td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="text-brand-600" onClick={() => setAdjusting(it)}>
                              <ArrowUpFromLine size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setItemEditing(it); setItemOpen(true); }}>
                              <Edit3 size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => setItemDel(it)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={itemPage} limit={20} total={items.data?.total || 0} onPage={setItemPage} />
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
            <Select
              value={txItem}
              onChange={(e) => { setTxItem(e.target.value); setTxPage(1); }}
              options={[{ value: '', label: 'All items' }, ...itemList.map((it) => ({ value: it._id, label: it.product }))]}
              className="w-full sm:w-64"
            />
          </div>
          {transactions.loading ? (
            <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
          ) : !txList.length ? (
            <EmptyState
              icon={ArrowDownToLine}
              title="No transactions"
              subtitle="Stock adjustments will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Type</th>
                    <th className="text-right">Qty</th>
                    <th>Reason</th>
                    <th className="text-right">Cost</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {txList.map((t) => (
                    <tr key={t._id}>
                      <td className="text-slate-600 dark:text-slate-300">{t.inventory?.product || '—'}</td>
                      <td><Badge tone={TX_TONE[t.type] || 'slate'}>{t.type}</Badge></td>
                      <td className={`text-right font-bold ${t.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                      </td>
                      <td className="max-w-[200px] truncate text-slate-500">{t.reason || '—'}</td>
                      <td className="text-right">{t.cost ? formatMoney(t.cost) : '—'}</td>
                      <td className="text-slate-500">{formatDateTime(t.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={txPage} limit={20} total={transactions.data?.total || 0} onPage={setTxPage} />
        </Card>
      )}

      <Modal open={itemOpen} onClose={() => setItemOpen(false)} title={itemEditing ? 'Edit item' : 'Add Inventory Item'} width="max-w-xl">
        <ItemForm
          initial={itemEditing}
          onSaved={() => { setItemOpen(false); items.refetch(); transactions.refetch(); }}
          onCancel={() => setItemOpen(false)}
        />
      </Modal>

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title="Adjust stock" width="max-w-xl">
        <AdjustForm
          item={adjusting}
          onSaved={() => { setAdjusting(null); items.refetch(); transactions.refetch(); }}
          onCancel={() => setAdjusting(null)}
        />
      </Modal>

      <ConfirmDialog
        open={!!itemDel}
        title="Delete item"
        message={`Delete "${itemDel?.product}"? This cannot be undone.`}
        onCancel={() => setItemDel(null)}
        onConfirm={removeItem}
      />
    </div>
  );
}