'use client';
/**
 * COUPONS — list, create, edit, disable.
 * APIs: GET/POST /admin/coupons · GET/PUT/DELETE /admin/coupons/{id}   (DELETE = disable)
 */
import { useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, DataTable, Empty, ErrorBox, Field, Loading, Modal } from '@/components/ui';
import { useConfirm, useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { dt, money, toLocalInput } from '@/lib/format';

const BLANK = { code: '', kind: 'percent', value: '', min_subtotal: 0, max_discount: '', usage_limit: '', per_user_limit: 1, starts_at: '', expires_at: '', is_active: true };

export default function CouponsSection() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => api('/admin/coupons'), []);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const rows = data || [];

  async function open(c) {
    if (!c) return setEdit({ ...BLANK });
    try { // GET /admin/coupons/{id} so the form always has the freshest values
      const f = await api(`/admin/coupons/${c.id}`);
      setEdit({ ...BLANK, ...f, max_discount: f.max_discount ?? '', usage_limit: f.usage_limit ?? '', starts_at: toLocalInput(f.starts_at), expires_at: toLocalInput(f.expires_at) });
    } catch (e) { toast.error(e.message); }
  }
  const set = (k) => (e) => setEdit((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save() {
    const v = Number(edit.value);
    if (edit.code.trim().length < 3) return toast.error('Code must be at least 3 characters');
    if (!(v > 0)) return toast.error('Value must be greater than 0');
    if (edit.kind === 'percent' && v > 100) return toast.error('Percent cannot exceed 100');
    const body = {
      code: edit.code.trim().toUpperCase(), kind: edit.kind, value: v, min_subtotal: Number(edit.min_subtotal) || 0,
      max_discount: edit.max_discount === '' ? null : Number(edit.max_discount),
      usage_limit: edit.usage_limit === '' ? null : parseInt(edit.usage_limit, 10),
      per_user_limit: parseInt(edit.per_user_limit, 10) || 1,
      starts_at: edit.starts_at ? new Date(edit.starts_at).toISOString() : null,
      expires_at: edit.expires_at ? new Date(edit.expires_at).toISOString() : null,
      is_active: !!edit.is_active,
    };
    setBusy(true);
    try {
      if (edit.id) await api(`/admin/coupons/${edit.id}`, { method: 'PUT', body });
      else await api('/admin/coupons', { method: 'POST', body });
      toast.ok('Coupon saved'); setEdit(null); reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function disable(c) {
    if (!(await confirm({ title: 'Disable coupon?', text: `${c.code} will stop working. You can re-enable it by editing.`, confirmText: 'Disable', danger: true }))) return;
    try { await api(`/admin/coupons/${c.id}`, { method: 'DELETE' }); toast.ok('Coupon disabled'); reload(); } catch (e) { toast.error(e.message); }
  }

  const state = (c) => {
    if (!c.is_active) return <Badge tone="gray">Disabled</Badge>;
    if (c.expires_at && new Date(c.expires_at) < new Date()) return <Badge tone="red">Expired</Badge>;
    if (c.usage_limit && c.used_count >= c.usage_limit) return <Badge tone="amber">Used up</Badge>;
    return <Badge tone="green">Active</Badge>;
  };
  const val = (c) => (c.kind === 'percent' ? `${c.value}%` : money(c.value));

  const columns = [
    { h: 'Code', cell: (c) => <b style={{ letterSpacing: '.04em' }}>{c.code}</b> },
    { h: 'Discount', cell: (c) => <div>{val(c)}{c.max_discount ? <div className="muted sm">max {money(c.max_discount)}</div> : null}</div> },
    { h: 'Min order', cell: (c) => (c.min_subtotal ? money(c.min_subtotal) : '—') },
    { h: 'Used', cell: (c) => `${c.used_count}${c.usage_limit ? ` / ${c.usage_limit}` : ''}` },
    { h: 'Valid until', cell: (c) => <span className="muted">{c.expires_at ? dt(c.expires_at, false) : 'No expiry'}</span> },
    { h: 'Status', cell: state },
    {
      h: '', cls: 'r', cell: (c) => (
        <div className="acts">
          <button className="btn sm" onClick={() => open(c)}><Icon name="edit" size={14} /> Edit</button>
          {c.is_active && <button className="btn sm danger" onClick={() => disable(c)}>Disable</button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="toolbar"><div className="muted">{rows.length} coupons</div><div className="grow" />
        <button className="btn pri" onClick={() => open(null)}><Icon name="plus" size={16} /> Add Coupon</button></div>
      <ErrorBox error={error} onRetry={reload} />
      <div className="card flush"><div className="bd">
        {loading && !data ? <Loading /> : rows.length === 0 ? <Empty icon="ticket" text="No coupons yet" /> : (
          <DataTable columns={columns} rows={rows} mobile={(c) => (
            <div>
              <div className="flex sp center"><b>{c.code}</b>{state(c)}</div>
              <div className="muted sm" style={{ margin: '5px 0 9px' }}>{val(c)} off · used {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</div>
              <div className="flex gap"><button className="btn sm" onClick={() => open(c)}>Edit</button>{c.is_active && <button className="btn sm danger" onClick={() => disable(c)}>Disable</button>}</div>
            </div>
          )} />
        )}
      </div></div>

      {edit && (
        <Modal title={edit.id ? `Edit ${edit.code}` : 'New coupon'} onClose={() => setEdit(null)}
          footer={<><button className="btn" onClick={() => setEdit(null)}>Cancel</button><button className="btn pri" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
          <Field label="Code *"><input className="input" value={edit.code} onChange={set('code')} placeholder="WELCOME10" autoFocus style={{ textTransform: 'uppercase' }} /></Field>
          <div className="row2">
            <Field label="Type"><select className="input" value={edit.kind} onChange={set('kind')}><option value="percent">Percent (%)</option><option value="fixed">Fixed amount (৳)</option></select></Field>
            <Field label="Value *"><input className="input" type="number" min="0" step="0.01" value={edit.value} onChange={set('value')} /></Field>
          </div>
          <div className="row2">
            <Field label="Minimum order (৳)"><input className="input" type="number" min="0" value={edit.min_subtotal} onChange={set('min_subtotal')} /></Field>
            <Field label="Max discount (৳)" hint="Cap for percent coupons"><input className="input" type="number" min="0" value={edit.max_discount} onChange={set('max_discount')} /></Field>
          </div>
          <div className="row2">
            <Field label="Total usage limit" hint="Empty = unlimited"><input className="input" type="number" min="1" value={edit.usage_limit} onChange={set('usage_limit')} /></Field>
            <Field label="Per customer limit"><input className="input" type="number" min="1" value={edit.per_user_limit} onChange={set('per_user_limit')} /></Field>
          </div>
          <div className="row2">
            <Field label="Starts"><input className="input" type="datetime-local" value={edit.starts_at} onChange={set('starts_at')} /></Field>
            <Field label="Expires"><input className="input" type="datetime-local" value={edit.expires_at} onChange={set('expires_at')} /></Field>
          </div>
          <label className="check"><input type="checkbox" checked={edit.is_active} onChange={set('is_active')} /> Active</label>
        </Modal>
      )}
    </div>
  );
}
