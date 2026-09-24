import React, { useMemo, useState } from 'react';
import { Download, FileText, FolderOpen, Plus, Trash2, Upload } from 'lucide-react';
import api, { apiDelete, apiPost, apiPut, errorMessage, fileUrl, uploadFile } from '../api/client';
import { usePageTitle } from '../components/Layout';
import { useApiData } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Spinner } from '../components/ui';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

const CATEGORIES = [
  { value: 'citizenship', label: 'Citizenship' },
  { value: 'passport', label: 'Passport' },
  { value: 'student_id', label: 'Student ID' },
  { value: 'college_id', label: 'College ID' },
  { value: 'photo', label: 'Photo' },
  { value: 'admission_form', label: 'Admission form' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'other', label: 'Other' }
];

const formatBytes = (b) => {
  if (!b && b !== 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = Number(b);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n >= 100 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
};

export default function Documents() {
  usePageTitle('Documents');
  const toast = useToast();
  const [category, setCategory] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'other' });
  const [file, setFile] = useState(null);

  const { data, loading, refetch } = useApiData(
    () => api.get('/documents', { params: { category } }).then((r) => r.data?.data),
    [category]
  );

  const list = useMemo(() => (Array.isArray(data) ? data : data?.data || []), [data]);
  const total = typeof data?.total === 'number' ? data.total : list.length;

  const submit = async () => {
    if (!file) return toast.error('Choose a file to upload');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', form.category);
      if (form.title.trim()) fd.append('title', form.title.trim());
      await uploadFile('/documents/upload', fd);
      toast.success('Document uploaded');
      setUploadOpen(false);
      setFile(null);
      setForm({ title: '', category: 'other' });
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const download = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc._id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName || doc.title || 'document';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to download file'));
    }
  };

  const remove = async () => {
    try {
      await apiDelete(`/documents/${del._id}`);
      toast.success('Document deleted');
      setDel(null);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setDel(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={`${total} documents`}
        icon={FolderOpen}
        actions={
          <Button icon={Upload} onClick={() => setUploadOpen(true)}>
            Upload Document
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} options={[
            { value: 'all', label: 'All categories' },
            ...CATEGORIES
          ]} className="w-44" />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-brand-600"><Spinner size={26} /></div>
        ) : !list.length ? (
          <EmptyState
            icon={FolderOpen}
            title="No documents"
            subtitle="Upload agreements, receipts, IDs and other hostel documents."
            action={<Button icon={Upload} onClick={() => setUploadOpen(true)}>Upload Document</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Category</th>
                  <th>File</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                          <FileText size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{d.title || d.originalName}</p>
                          <p className="text-[11px] text-slate-400">{d.originalName}</p>
                        </div>
                      </div>
                    </td>
                    <td><Badge tone="indigo">{d.category}</Badge></td>
                    <td className="text-slate-500">{d.mimetype || '—'}</td>
                    <td className="text-slate-500">{formatBytes(d.size)}</td>
                    <td className="text-slate-500">{formatDateTime(d.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => download(d)}>
                          <Download size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          onClick={() => setDel(d)}
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
        <Pagination page={1} limit={list.length || 20} total={total} onPage={() => {}} />
      </Card>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Document">
        <div className="space-y-4">
          <div>
            <label className="label">File *</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="input cursor-pointer"
            />
          </div>
          <Input label="Title (optional)" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Rental agreement 2026" />
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            options={CATEGORIES}
          />
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button loading={busy} icon={Upload} onClick={submit}>Upload</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete document"
        message={`Delete "${del?.title || del?.originalName}"? This cannot be undone.`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}