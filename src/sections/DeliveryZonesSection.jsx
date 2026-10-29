'use client';
/**
 * DELIVERY ZONES — shipping fee per zone / district list.
 * APIs: GET/POST /admin/delivery-zones · PUT/DELETE /admin/delivery-zones/{id}
 */
import { useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, DataTable, Empty, ErrorBox, Field, Loading, Modal } from '@/components/ui';
import { useConfirm, useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { money } from '@/lib/format';

const BLANK = { name: '', districts: '', fee: '', free_over: '' };

export default function DeliveryZonesSection() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => api('/admin/delivery-zones'), []);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const rows = data || [];
  const set = (k) => (e) => setEdit((s) => ({ ...s, [k]: e.target.value }));

  async function save() {
    if (!edit.name.trim()) return toast.error('Zone name is required');
    if (edit.fee === '' || Number(edit.fee) < 0) return toast.error('Enter the delivery fee');
    const body = {
      name: edit.name.trim(), fee: Number(edit.fee), free_over: edit.free_over === '' ? null : Number(edit.free_over),
      districts: edit.districts.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
    };
    setBusy(true);
    try {
      if (edit.id) await api(`/admin/delivery-zones/${edit.id}`, { method: 'PUT', body });
      else await api('/admin/delivery-zones', { method: 'POST', body });
      toast.ok('Zone saved'); setEdit(null); reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function remove(z) {
    if (!(await confirm({ title: 'Delete zone?', text: z.name, confirmText: 'Delete', danger: true }))) return;
    try { await api(`/admin/delivery-zones/${z.id}`, { method: 'DELETE' }); toast.ok('Zone deleted'); reload(); } catch (e) { toast.error(e.message); }
  }
  const open = (z) => setEdit(z ? { id: z.id, name: z.name, fee: z.fee, free_over: z.free_over ?? '', districts: (z.districts || []).join(', ') } : { ...BLANK });
  const Dists = ({ z }) => <div className="flex gap wrap">{(z.districts || []).slice(0, 6).map((d) => <Badge key={d}>{d}</Badge>)}{(z.districts || []).length > 6 && <span className="muted sm">+{z.districts.length - 6}</span>}{!(z.districts || []).length && <span className="muted">—</span>}</div>;

  const columns = [
    { h: 'Zone', cell: (z) => <b>{z.name}</b> },
    { h: 'Districts', cell: (z) => <Dists z={z} /> },
    { h: 'Fee', cell: (z) => <b>{money(z.fee)}</b> },
    { h: 'Free over', cell: (z) => (z.free_over ? money(z.free_over) : <span className="muted">—</span>) },
    { h: '', cls: 'r', cell: (z) => <div className="acts"><button className="btn sm" onClick={() => open(z)}><Icon name="edit" size={14} /> Edit</button><button className="btn sm danger" onClick={() => remove(z)}><Icon name="trash" size={14} /></button></div> },
  ];

  return (
    <div>
      <div className="toolbar"><div className="muted">{rows.length} zones</div><div className="grow" /><button className="btn pri" onClick={() => open(null)}><Icon name="plus" size={16} /> Add Zone</button></div>
      <ErrorBox error={error} onRetry={reload} />
      <div className="card flush"><div className="bd">
        {loading && !data ? <Loading /> : rows.length === 0 ? <Empty icon="truck" text="No delivery zones yet" /> : (
          <DataTable columns={columns} rows={rows} mobile={(z) => (
            <div><div className="flex sp"><b>{z.name}</b><b>{money(z.fee)}</b></div><div style={{ margin: '8px 0' }}><Dists z={z} /></div>
              <div className="flex gap"><button className="btn sm" onClick={() => open(z)}>Edit</button><button className="btn sm danger" onClick={() => remove(z)}><Icon name="trash" size={14} /></button></div></div>
          )} />
        )}
      </div></div>
      {edit && (
        <Modal title={edit.id ? 'Edit zone' : 'New zone'} onClose={() => setEdit(null)}
          footer={<><button className="btn" onClick={() => setEdit(null)}>Cancel</button><button className="btn pri" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
          <Field label="Zone name *"><input className="input" value={edit.name} onChange={set('name')} placeholder="Dhaka City" autoFocus /></Field>
          <Field label="Districts" hint="Separate with commas"><textarea className="input" rows={3} value={edit.districts} onChange={set('districts')} placeholder="Dhaka, Gazipur, Narayanganj" /></Field>
          <div className="row2">
            <Field label="Delivery fee (৳) *"><input className="input" type="number" min="0" value={edit.fee} onChange={set('fee')} /></Field>
            <Field label="Free delivery over (৳)" hint="Empty = never free"><input className="input" type="number" min="0" value={edit.free_over} onChange={set('free_over')} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
