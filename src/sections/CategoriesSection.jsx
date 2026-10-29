'use client';
/**
 * CATEGORIES — list, create, edit, delete.
 * APIs: GET/POST /admin/categories · PUT/DELETE /admin/categories/{id} · POST /admin/upload
 */
import { useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, DataTable, Empty, ErrorBox, Field, ImageUploader, Loading, Modal, Thumb } from '@/components/ui';
import { useConfirm, useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { slugify } from '@/lib/format';

const BLANK = { name: '', slug: '', parent_id: '', image_url: '', sort_order: 0, is_active: true };

export default function CategoriesSection() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => api('/admin/categories'), []);
  const [edit, setEdit] = useState(null); // null | {id?, ...fields}
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const rows = data || [];
  const nameOf = Object.fromEntries(rows.map((c) => [c.id, c.name]));

  function open(c) {
    setTouched(!!c);
    setEdit(c ? { ...c, parent_id: c.parent_id ?? '', image_url: c.image_url || '' } : { ...BLANK, sort_order: rows.length });
  }
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setEdit((s) => ({ ...s, [k]: v, ...(k === 'name' && !touched ? { slug: slugify(v) } : {}) }));
    if (k === 'slug') setTouched(true);
  };

  async function save() {
    if (!edit.name.trim() || !edit.slug.trim()) return toast.error('Name and slug are required');
    const body = {
      name: edit.name.trim(), slug: edit.slug.trim(), parent_id: edit.parent_id === '' ? null : Number(edit.parent_id),
      image_url: edit.image_url || null, sort_order: parseInt(edit.sort_order, 10) || 0, is_active: !!edit.is_active,
    };
    setBusy(true);
    try {
      if (edit.id) await api(`/admin/categories/${edit.id}`, { method: 'PUT', body });
      else await api('/admin/categories', { method: 'POST', body });
      toast.ok('Category saved'); setEdit(null); reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function remove(c) {
    if (!(await confirm({ title: 'Delete category?', text: `"${c.name}" will be deleted. Categories that still have products can't be deleted.`, confirmText: 'Delete', danger: true }))) return;
    try { await api(`/admin/categories/${c.id}`, { method: 'DELETE' }); toast.ok('Category deleted'); reload(); }
    catch (e) { toast.error(e.message); }
  }

  const columns = [
    { h: 'Category', cell: (c) => <div className="cell-prod"><Thumb src={c.image_url} icon="tag" /><div className="t"><b>{c.name}</b><small>/{c.slug}</small></div></div> },
    { h: 'Parent', cell: (c) => (c.parent_id ? nameOf[c.parent_id] || `#${c.parent_id}` : <span className="muted">—</span>) },
    { h: 'Order', cell: (c) => c.sort_order },
    { h: 'Status', cell: (c) => <Badge tone={c.is_active ? 'green' : 'gray'}>{c.is_active ? 'Active' : 'Hidden'}</Badge> },
    {
      h: '', cls: 'r', cell: (c) => (
        <div className="acts">
          <button className="btn sm" onClick={() => open(c)}><Icon name="edit" size={14} /> Edit</button>
          <button className="btn sm danger" onClick={() => remove(c)} aria-label="Delete"><Icon name="trash" size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="toolbar">
        <div className="muted">{rows.length} categories</div>
        <div className="grow" />
        <button className="btn pri" onClick={() => open(null)}><Icon name="plus" size={16} /> Add Category</button>
      </div>
      <ErrorBox error={error} onRetry={reload} />
      <div className="card flush"><div className="bd">
        {loading && !data ? <Loading /> : rows.length === 0 ? <Empty icon="tag" text="No categories yet" /> : (
          <DataTable columns={columns} rows={rows} mobile={(c) => (
            <div className="flex sp center gap">
              <div className="cell-prod"><Thumb src={c.image_url} icon="tag" /><div className="t"><b>{c.name}</b><small>{c.parent_id ? `in ${nameOf[c.parent_id] || ''}` : 'Top level'} · <Badge tone={c.is_active ? 'green' : 'gray'}>{c.is_active ? 'Active' : 'Hidden'}</Badge></small></div></div>
              <div className="flex gap"><button className="btn sm" onClick={() => open(c)}>Edit</button><button className="btn sm danger" onClick={() => remove(c)}><Icon name="trash" size={14} /></button></div>
            </div>
          )} />
        )}
      </div></div>

      {edit && (
        <Modal title={edit.id ? 'Edit category' : 'New category'} onClose={() => setEdit(null)}
          footer={<><button className="btn" onClick={() => setEdit(null)}>Cancel</button><button className="btn pri" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
          <Field label="Name *"><input className="input" value={edit.name} onChange={set('name')} autoFocus /></Field>
          <div className="row2">
            <Field label="Slug *"><input className="input" value={edit.slug} onChange={set('slug')} /></Field>
            <Field label="Sort order"><input className="input" type="number" value={edit.sort_order} onChange={set('sort_order')} /></Field>
          </div>
          <Field label="Parent category">
            <select className="input" value={edit.parent_id} onChange={set('parent_id')}>
              <option value="">— Top level —</option>
              {rows.filter((c) => c.id !== edit.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Image">
            <ImageUploader single value={edit.image_url ? [edit.image_url] : []} onChange={(a) => setEdit((s) => ({ ...s, image_url: a[0] || '' }))} />
          </Field>
          <label className="check"><input type="checkbox" checked={edit.is_active} onChange={set('is_active')} /> Visible in the shop</label>
        </Modal>
      )}
    </div>
  );
}
