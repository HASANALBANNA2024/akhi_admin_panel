'use client';
/**
 * BANNERS — homepage banners: list, create, edit, delete, show/hide.
 * APIs: GET/POST /admin/banners · PUT/DELETE /admin/banners/{id} · POST /admin/upload
 */
import { useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, Empty, ErrorBox, Field, ImageUploader, Loading, Modal, Switch } from '@/components/ui';
import { useConfirm, useToast } from '@/components/Providers';
import { api, assetUrl } from '@/lib/api';
import { useAsync } from '@/lib/hooks';

const BLANK = { title: '', image_url: '', link_url: '', sort_order: 0, is_active: true };

export default function BannersSection() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => api('/admin/banners'), []);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const rows = data || [];
  const set = (k) => (e) => setEdit((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const body = (b) => ({ title: b.title || null, image_url: b.image_url, link_url: b.link_url || null, sort_order: parseInt(b.sort_order, 10) || 0, is_active: !!b.is_active });

  async function save() {
    if (!edit.image_url) return toast.error('Please upload a banner image');
    setBusy(true);
    try {
      if (edit.id) await api(`/admin/banners/${edit.id}`, { method: 'PUT', body: body(edit) });
      else await api('/admin/banners', { method: 'POST', body: body(edit) });
      toast.ok('Banner saved'); setEdit(null); reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function toggle(b, v) {
    try { await api(`/admin/banners/${b.id}`, { method: 'PUT', body: body({ ...b, is_active: v }) }); toast.ok(v ? 'Banner shown' : 'Banner hidden'); reload(); }
    catch (e) { toast.error(e.message); }
  }
  async function remove(b) {
    if (!(await confirm({ title: 'Delete banner?', text: b.title || 'This banner will be removed.', confirmText: 'Delete', danger: true }))) return;
    try { await api(`/admin/banners/${b.id}`, { method: 'DELETE' }); toast.ok('Banner deleted'); reload(); } catch (e) { toast.error(e.message); }
  }

  return (
    <div>
      <div className="toolbar"><div className="muted">{rows.length} banners</div><div className="grow" />
        <button className="btn pri" onClick={() => setEdit({ ...BLANK, sort_order: rows.length })}><Icon name="plus" size={16} /> Add Banner</button></div>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : rows.length === 0 ? <div className="card"><Empty icon="image" text="No banners yet" /></div> : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
          {rows.map((b) => (
            <div className="card" key={b.id} style={{ overflow: 'hidden' }}>
              <div style={{ aspectRatio: '16/6', background: `var(--gray-l) url(${assetUrl(b.image_url)}) center/cover` }} />
              <div className="bd">
                <div className="flex sp center"><b>{b.title || 'Untitled'}</b><Badge tone="gray">#{b.sort_order}</Badge></div>
                <div className="muted sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.link_url || 'No link'}</div>
                <div className="flex sp center" style={{ marginTop: 12 }}>
                  <div className="flex center gap"><Switch checked={b.is_active} onChange={(v) => toggle(b, v)} /><span className="muted sm">{b.is_active ? 'Shown' : 'Hidden'}</span></div>
                  <div className="flex gap">
                    <button className="btn sm" onClick={() => setEdit({ ...b, title: b.title || '', link_url: b.link_url || '' })}><Icon name="edit" size={14} /></button>
                    <button className="btn sm danger" onClick={() => remove(b)}><Icon name="trash" size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <Modal title={edit.id ? 'Edit banner' : 'New banner'} onClose={() => setEdit(null)}
          footer={<><button className="btn" onClick={() => setEdit(null)}>Cancel</button><button className="btn pri" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
          <Field label="Banner image *"><ImageUploader single value={edit.image_url ? [edit.image_url] : []} onChange={(a) => setEdit((s) => ({ ...s, image_url: a[0] || '' }))} /></Field>
          <Field label="Title"><input className="input" value={edit.title} onChange={set('title')} /></Field>
          <Field label="Link (where it opens)"><input className="input" value={edit.link_url} onChange={set('link_url')} placeholder="/category/hair-clips" /></Field>
          <div className="row2">
            <Field label="Sort order"><input className="input" type="number" value={edit.sort_order} onChange={set('sort_order')} /></Field>
            <Field label=" "><label className="check" style={{ marginTop: 8 }}><input type="checkbox" checked={edit.is_active} onChange={set('is_active')} /> Visible</label></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
