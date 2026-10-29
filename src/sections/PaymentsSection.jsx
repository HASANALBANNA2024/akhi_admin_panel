'use client';
/**
 * PAYMENTS — verify manual bKash/Nagad payments + full payment history.
 * APIs:
 *   GET  /admin/payments/pending            queue waiting for a check
 *   GET  /admin/payments?status=&method=&page=   history (50 per page, plain array)
 *   POST /admin/payments/{id}/approve       body {note}
 *   POST /admin/payments/{id}/reject        body {note}
 */
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, DataTable, Empty, ErrorBox, Field, Loading, Modal, Pager } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { METHOD_LABEL, PAYMENT_TONE, dt, label, money } from '@/lib/format';

export default function PaymentsSection() {
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);
  const [dlg, setDlg] = useState(null); // {p, action}
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pending = useAsync(() => api('/admin/payments/pending'), []);
  const all = useAsync(() => (tab === 'all' ? api('/admin/payments', { query: { status, method, page } }) : Promise.resolve(null)), [tab, status, method, page]);

  function ask(p, action) { setDlg({ p, action }); setNote(''); }
  async function submit() {
    setBusy(true);
    try {
      await api(`/admin/payments/${dlg.p.payment_id}/${dlg.action}`, { method: 'POST', body: { note: note.trim() || null } });
      toast.ok(dlg.action === 'approve' ? 'Payment approved — order marked paid' : 'Payment rejected — customer can resubmit');
      setDlg(null); pending.reload(); all.reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  const pendingCols = [
    { h: 'Order', cell: (p) => <Link href={`/orders?open=${p.order_no}`} className="bold">{p.order_no}</Link> },
    { h: 'Method', cell: (p) => <Badge tone="pink">{METHOD_LABEL[p.method] || p.method}</Badge> },
    { h: 'Amount', cell: (p) => <b>{money(p.amount)}</b> },
    { h: 'Sender number', cell: (p) => p.sender_number || '—' },
    { h: 'TrxID', cell: (p) => <code>{p.trx_id || '—'}</code> },
    { h: 'Submitted', cell: (p) => <span className="muted">{dt(p.submitted_at)}</span> },
    {
      h: '', cls: 'r', cell: (p) => (
        <div className="acts">
          <button className="btn sm ok" onClick={() => ask(p, 'approve')}><Icon name="check" size={14} /> Approve</button>
          <button className="btn sm danger" onClick={() => ask(p, 'reject')}><Icon name="x" size={14} /> Reject</button>
        </div>
      ),
    },
  ];
  const allCols = [
    { h: 'Order', cell: (p) => <Link href={`/orders?open=${p.order_no}`} className="bold">{p.order_no}</Link> },
    { h: 'Method', cell: (p) => METHOD_LABEL[p.method] || p.method },
    { h: 'Amount', cell: (p) => <b>{money(p.amount)}</b> },
    { h: 'Sender', cell: (p) => p.sender_number || '—' },
    { h: 'TrxID', cell: (p) => <code>{p.trx_id || '—'}</code> },
    { h: 'Status', cell: (p) => <Badge tone={PAYMENT_TONE[p.status]}>{label(p.status)}</Badge> },
    { h: 'Date', cell: (p) => <span className="muted">{dt(p.created_at)}</span> },
  ];

  const pendRows = pending.data || [];
  const allRows = all.data || [];

  return (
    <div>
      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${tab === 'pending' ? 'on' : ''}`} onClick={() => setTab('pending')}>To verify {pendRows.length ? `(${pendRows.length})` : ''}</button>
          <button className={`tab ${tab === 'all' ? 'on' : ''}`} onClick={() => setTab('all')}>All payments</button>
        </div>
        <div className="grow" />
        {tab === 'all' && (
          <>
            <select className="input" style={{ width: 160 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
            </select>
            <select className="input" style={{ width: 190 }} value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}>
              <option value="">All methods</option>
              {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </>
        )}
        <button className="btn" onClick={() => { pending.reload(); all.reload(); }}><Icon name="refresh" size={15} /> Refresh</button>
      </div>

      {tab === 'pending' ? (
        <>
          <div className="infobox">Check the TrxID and amount in your bKash/Nagad app before approving. Approving marks the order as paid.</div>
          <ErrorBox error={pending.error} onRetry={pending.reload} />
          <div className="card flush"><div className="bd">
            {pending.loading && !pending.data ? <Loading /> : pendRows.length === 0 ? <Empty icon="card" text="No payments waiting for verification" /> : (
              <DataTable columns={pendingCols} rows={pendRows} rowKey="payment_id" mobile={(p) => (
                <div>
                  <div className="flex sp center"><Link href={`/orders?open=${p.order_no}`} className="bold">{p.order_no}</Link><b>{money(p.amount)}</b></div>
                  <div className="muted sm" style={{ margin: '6px 0' }}>{METHOD_LABEL[p.method]} · from {p.sender_number || '—'} · TrxID <code>{p.trx_id}</code></div>
                  <div className="flex gap">
                    <button className="btn sm ok" onClick={() => ask(p, 'approve')}>Approve</button>
                    <button className="btn sm danger" onClick={() => ask(p, 'reject')}>Reject</button>
                  </div>
                </div>
              )} />
            )}
          </div></div>
        </>
      ) : (
        <>
          <ErrorBox error={all.error} onRetry={all.reload} />
          <div className="card flush"><div className="bd">
            {all.loading && !all.data ? <Loading /> : allRows.length === 0 && page === 1 ? <Empty icon="card" text="No payments found" /> : (
              <>
                <DataTable columns={allCols} rows={allRows} rowKey="payment_id" mobile={(p) => (
                  <div>
                    <div className="flex sp center"><Link href={`/orders?open=${p.order_no}`} className="bold">{p.order_no}</Link><b>{money(p.amount)}</b></div>
                    <div className="muted sm" style={{ margin: '6px 0' }}>{METHOD_LABEL[p.method]} · {dt(p.created_at)}</div>
                    <Badge tone={PAYMENT_TONE[p.status]}>{label(p.status)}</Badge>
                  </div>
                )} />
                <Pager page={page} pageSize={50} count={allRows.length} onPage={setPage} />
              </>
            )}
          </div></div>
        </>
      )}

      {dlg && (
        <Modal title={dlg.action === 'approve' ? 'Approve payment' : 'Reject payment'} onClose={() => setDlg(null)}
          footer={<>
            <button className="btn" onClick={() => setDlg(null)}>Cancel</button>
            <button className={`btn ${dlg.action === 'approve' ? 'ok' : 'danger'}`} disabled={busy} onClick={submit}>{busy ? 'Please wait…' : dlg.action === 'approve' ? 'Approve' : 'Reject'}</button>
          </>}>
          <dl className="kv" style={{ marginBottom: 14 }}>
            <dt>Order</dt><dd>{dlg.p.order_no}</dd>
            <dt>Method</dt><dd>{METHOD_LABEL[dlg.p.method] || dlg.p.method}</dd>
            <dt>Amount</dt><dd><b>{money(dlg.p.amount)}</b></dd>
            <dt>Sender</dt><dd>{dlg.p.sender_number || '—'}</dd>
            <dt>TrxID</dt><dd><code>{dlg.p.trx_id || '—'}</code></dd>
          </dl>
          <Field label="Note (optional)"><textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={dlg.action === 'reject' ? 'Reason, e.g. TrxID not found' : 'Internal note'} /></Field>
        </Modal>
      )}
    </div>
  );
}
