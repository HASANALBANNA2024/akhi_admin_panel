'use client';
/**
 * STAFF — owner only: add staff, activate / deactivate, reset password.
 * APIs: GET/POST /admin/staff · PATCH /admin/staff/{id}?active= · PUT /admin/staff/{id}/password?new_password=
 */
import { useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, DataTable, Empty, ErrorBox, Field, Loading, Modal, Switch } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';

export default function StaffSection() {
  const { isOwner } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => (isOwner ? api('/admin/staff') : Promise.resolve([])), [isOwner]);
  const [add, setAdd] = useState(null);
  const [pw, setPw] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!isOwner) return <div className="infobox">Only the owner account can manage staff.</div>;
  const rows = data || [];

  async function create() {
    if (add.username.trim().length < 3) return toast.error('Username must be at least 3 characters');
    if (add.password.length < 8) return toast.error('Password must be at least 8 characters');
    setBusy(true);
    try { await api('/admin/staff', { method: 'POST', body: { username: add.username.trim(), password: add.password, role: add.role } }); toast.ok('Staff added'); setAdd(null); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function toggle(s, v) {
    try { await api(`/admin/staff/${s.id}`, { method: 'PATCH', query: { active: v } }); toast.ok(v ? 'Account activated' : 'Account deactivated'); reload(); }
    catch (e) { toast.error(e.message); }
  }
  async function reset() {
    if (pw.value.length < 8) return toast.error('Password must be at least 8 characters');
    setBusy(true);
    try { await api(`/admin/staff/${pw.s.id}/password`, { method: 'PUT', query: { new_password: pw.value } }); toast.ok('Password changed'); setPw(null); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  const columns = [
    { h: 'User', cell: (s) => <div className="cell-prod"><div className="avatar">{s.username.slice(0, 1).toUpperCase()}</div><b>{s.username}</b></div> },
    { h: 'Role', cell: (s) => <Badge tone={s.role === 'owner' ? 'pink' : 'blue'}>{s.role}</Badge> },
    { h: 'Active', cell: (s) => <Switch checked={s.is_active} onChange={(v) => toggle(s, v)} /> },
    { h: '', cls: 'r', cell: (s) => <button className="btn sm" onClick={() => setPw({ s, value: '' })}><Icon name="key" size={14} /> Reset password</button> },
  ];

  return (
    <div>
      <div className="toolbar"><div className="muted">{rows.length} accounts</div><div className="grow" />
        <button className="btn pri" onClick={() => setAdd({ username: '', password: '', role: 'staff' })}><Icon name="plus" size={16} /> Add Staff</button></div>
      <div className="infobox">Staff can manage orders, products, payments, chat and so on. Settings, reports with profit/sales, and this page are owner only.</div>
      <ErrorBox error={error} onRetry={reload} />
      <div className="card flush"><div className="bd">
        {loading && !data ? <Loading /> : rows.length === 0 ? <Empty icon="shield" text="No staff accounts yet" /> : (
          <DataTable columns={columns} rows={rows} mobile={(s) => (
            <div className="flex sp center gap"><div><b>{s.username}</b> <Badge tone={s.role === 'owner' ? 'pink' : 'blue'}>{s.role}</Badge></div>
              <div className="flex center gap"><Switch checked={s.is_active} onChange={(v) => toggle(s, v)} /><button className="btn sm" onClick={() => setPw({ s, value: '' })}><Icon name="key" size={14} /></button></div></div>
          )} />
        )}
      </div></div>

      {add && (
        <Modal title="Add staff" onClose={() => setAdd(null)} footer={<><button className="btn" onClick={() => setAdd(null)}>Cancel</button><button className="btn pri" disabled={busy} onClick={create}>Create</button></>}>
          <Field label="Username"><input className="input" value={add.username} onChange={(e) => setAdd({ ...add, username: e.target.value })} autoFocus /></Field>
          <Field label="Password" hint="At least 8 characters"><input className="input" type="text" value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} /></Field>
          <Field label="Role"><select className="input" value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}><option value="staff">Staff</option><option value="owner">Owner</option></select></Field>
        </Modal>
      )}
      {pw && (
        <Modal title={`Reset password — ${pw.s.username}`} onClose={() => setPw(null)} footer={<><button className="btn" onClick={() => setPw(null)}>Cancel</button><button className="btn pri" disabled={busy} onClick={reset}>Change</button></>}>
          <Field label="New password" hint="At least 8 characters"><input className="input" value={pw.value} onChange={(e) => setPw({ ...pw, value: e.target.value })} autoFocus /></Field>
        </Modal>
      )}
    </div>
  );
}
