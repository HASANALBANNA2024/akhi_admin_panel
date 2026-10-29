'use client';
/**
 * RETURNS — review return requests.
 * APIs: GET /admin/returns?status= · PATCH /admin/returns/{id}?restock=  body {status: approved|rejected|refunded, note}
 */
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, Empty, ErrorBox, Field, Loading, Modal } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { RETURN_TONE, dt, label, money } from '@/lib/format';

export default function ReturnsSection() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [dlg, setDlg] = useState(null);
  const [note, setNote] = useState('');
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);
  const list = useAsync(() => api('/admin/returns', { query: { status } }), [status]);
  const rows = list.data || [];

  function ask(r, action) { setDlg({ r, action }); setNote(r.admin_note || ''); setRestock(action !== 'rejected'); }
  async function submit() {
    setBusy(true);
    try {
      await api(`/admin/returns/${dlg.r.id}`, { method: 'PATCH', query: { restock: restock && dlg.action !== 'rejected' }, body: { status: dlg.action, note: note.trim() || null } });
      toast.ok(`Return ${dlg.action}`); setDlg(null); list.reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="toolbar"><div className="tabs">
        {[['', 'All'], ['requested', 'Requested'], ['approved', 'Approved'], ['refunded', 'Refunded'], ['rejected', 'Rejected']].map(([k, t]) => (
          <button key={t} className={`tab ${status === k ? 'on' : ''}`} onClick={() => setStatus(k)}>{t}</button>))}
      </div></div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      <div className="grid">
        {list.loading && !list.data ? <Loading /> : rows.length === 0 ? <div className="card"><Empty icon="undo" text="No return requests" /></div> : rows.map((r) => (
          <div className="card" key={r.id}><div className="bd">
            <div className="flex sp center wrap gap">
              <div><Link href={`/orders?open=${r.order_no}`} className="bold">{r.order_no}</Link> <span className="muted sm">· {money(r.total)} · {dt(r.created_at)}</span></div>
              <Badge tone={RETURN_TONE[r.status]}>{label(r.status)}</Badge>
            </div>
            <div style={{ margin: '10px 0', whiteSpace: 'pre-wrap' }}><span className="muted">Reason: </span>{r.reason}</div>
            {r.admin_note && <div className="muted sm">Your note: {r.admin_note}</div>}
            <div className="flex gap wrap" style={{ marginTop: 10 }}>
              {r.status === 'requested' && <>
                <button className="btn sm ok" onClick={() => ask(r, 'approved')}><Icon name="check" size={14} /> Approve</button>
                <button className="btn sm danger" onClick={() => ask(r, 'rejected')}><Icon name="x" size={14} /> Reject</button>
              </>}
              {r.status === 'approved' && <button className="btn sm dark" onClick={() => ask(r, 'refunded')}><Icon name="wallet" size={14} /> Mark refunded</button>}
            </div>
          </div></div>
        ))}
      </div>

      {dlg && (
        <Modal title={`${label(dlg.action)} return — ${dlg.r.order_no}`} onClose={() => setDlg(null)}
          footer={<><button className="btn" onClick={() => setDlg(null)}>Cancel</button><button className={`btn ${dlg.action === 'rejected' ? 'danger' : 'pri'}`} disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Confirm'}</button></>}>
          {dlg.action === 'refunded' && <div className="infobox">Marking as refunded only updates the order. Send the money yourself through bKash / bank.</div>}
          <Field label="Note to record (optional)"><textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          {dlg.action !== 'rejected' && <label className="check"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Put returned items back in stock</label>}
        </Modal>
      )}
    </div>
  );
}
