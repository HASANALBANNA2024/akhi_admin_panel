'use client';
/**
 * SETTINGS — payment methods, minimum order, change my password.
 * APIs: GET /admin/settings · PATCH /admin/settings (owner) · POST /admin/me/password
 */
import { useEffect, useState } from 'react';
import { ErrorBox, Field, Loading, Switch } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { METHOD_LABEL } from '@/lib/format';

export default function SettingsSection() {
  const { isOwner, session } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api('/admin/settings'), []);
  const [methods, setMethods] = useState({});
  const [min, setMin] = useState('');
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ old_password: '', new_password: '', again: '' });

  useEffect(() => { if (data) { setMethods(data.payment_methods || {}); setMin(data.min_order_amount ?? ''); } }, [data]);

  async function save() {
    setBusy(true);
    try {
      await api('/admin/settings', { method: 'PATCH', body: { payment_methods: methods, min_order_amount: min === '' ? 0 : Number(min) } });
      toast.ok('Settings saved'); reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function changePw(e) {
    e.preventDefault();
    if (pw.new_password.length < 8) return toast.error('New password must be at least 8 characters');
    if (pw.new_password !== pw.again) return toast.error('Passwords do not match');
    try {
      await api('/admin/me/password', { method: 'POST', body: { old_password: pw.old_password, new_password: pw.new_password } });
      toast.ok('Password changed'); setPw({ old_password: '', new_password: '', again: '' });
    } catch (err) { toast.error(err.message); }
  }

  if (loading && !data) return <Loading />;
  return (
    <div className="grid g2 stack" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="hd"><h3>Checkout settings</h3></div>
        <div className="bd">
          <ErrorBox error={error} onRetry={reload} />
          {!isOwner && <div className="infobox">Only the owner can change these settings.</div>}
          <h4 style={{ marginBottom: 8 }}>Payment methods</h4>
          {Object.keys(METHOD_LABEL).map((k) => (
            <div className="list-item" key={k}>
              <div className="grow"><b>{METHOD_LABEL[k]}</b></div>
              <Switch checked={!!methods[k]} disabled={!isOwner} onChange={(v) => setMethods((m) => ({ ...m, [k]: v }))} />
            </div>
          ))}
          <Field label="Minimum order amount (৳)"><input className="input" type="number" min="0" disabled={!isOwner} value={min} onChange={(e) => setMin(e.target.value)} style={{ marginTop: 14 }} /></Field>
          {isOwner && <button className="btn pri" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>}
        </div>
      </div>

      <div className="card">
        <div className="hd"><h3>My account</h3></div>
        <form className="bd" onSubmit={changePw}>
          <div className="muted sm" style={{ marginBottom: 12 }}>Signed in as <b>{session?.username}</b> ({session?.role})</div>
          <Field label="Current password"><input className="input" type="password" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} autoComplete="current-password" required /></Field>
          <Field label="New password" hint="At least 8 characters"><input className="input" type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} autoComplete="new-password" required /></Field>
          <Field label="Repeat new password"><input className="input" type="password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} autoComplete="new-password" required /></Field>
          <button className="btn dark">Change password</button>
          <div className="muted sm" style={{ marginTop: 10 }}>The very first owner account created from the .env file can't change its password here — edit ADMIN_PASSWORD in the backend .env.</div>
        </form>
      </div>
    </div>
  );
}
