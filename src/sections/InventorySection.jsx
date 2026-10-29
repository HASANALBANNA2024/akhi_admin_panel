'use client';
/**
 * INVENTORY — low stock list, stock adjustment with reason, movement history.
 * APIs:
 *   GET  /admin/reports/low-stock?threshold=
 *   POST /admin/inventory/adjust        {product_id, delta, reason}
 *   GET  /admin/inventory/movements?product_id=
 *   GET  /admin/products?q=              (product picker + names)
 */
import { useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, DataTable, Empty, ErrorBox, Field, Loading, Modal, SearchBox } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAsync, useDebounce } from '@/lib/hooks';
import { dt, num } from '@/lib/format';

export default function InventorySection() {
  const toast = useToast();
  const [tab, setTab] = useState('low');
  const [threshold, setThreshold] = useState(5);
  const [adj, setAdj] = useState(null); // {id,name,stock}
  const [pickQ, setPickQ] = useState('');
  const [picker, setPicker] = useState(false);
  const dpq = useDebounce(pickQ);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [pid, setPid] = useState('');

  const low = useAsync(() => api('/admin/reports/low-stock', { query: { threshold } }), [threshold]);
  const moves = useAsync(() => (tab === 'moves' ? api('/admin/inventory/movements', { query: { product_id: pid } }) : Promise.resolve(null)), [tab, pid]);
  const prods = useAsync(() => api('/admin/products', { query: { page_size: 100 } }).catch(() => ({ items: [] })), []);
  const names = useMemo(() => Object.fromEntries((prods.data?.items || []).map((p) => [p.id, p.name])), [prods.data]);
  const found = useAsync(() => (picker ? api('/admin/products', { query: { q: dpq, page_size: 8 } }) : Promise.resolve(null)), [picker, dpq]);

  function openAdjust(p) { setAdj(p || null); setPicker(!p); setDelta(''); setReason(''); setPickQ(''); setOpen(true); }
  const [open, setOpen] = useState(false);

  async function submit() {
    const d = parseInt(delta, 10);
    if (!adj) return toast.error('Choose a product');
    if (!d) return toast.error('Enter a quantity (use − to remove stock)');
    if (reason.trim().length < 2) return toast.error('Please give a reason');
    setBusy(true);
    try {
      const r = await api('/admin/inventory/adjust', { method: 'POST', body: { product_id: adj.id, delta: d, reason: reason.trim() } });
      toast.ok(`Stock is now ${r.stock}`); setOpen(false); low.reload(); moves.reload(); prods.reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  const lowCols = [
    { h: 'Product', cell: (p) => <div><b>{p.name}</b>{p.sku && <div className="muted sm">SKU {p.sku}</div>}</div> },
    { h: 'Stock', cell: (p) => <Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</Badge> },
    { h: '', cls: 'r', cell: (p) => <button className="btn sm" onClick={() => openAdjust(p)}><Icon name="plus" size={14} /> Adjust</button> },
  ];
  const moveCols = [
    { h: 'Date', cell: (m) => <span className="muted">{dt(m.created_at)}</span> },
    { h: 'Product', cell: (m) => names[m.product_id] || `#${m.product_id}` },
    { h: 'Change', cell: (m) => <b style={{ color: m.delta > 0 ? 'var(--green)' : 'var(--red)' }}>{m.delta > 0 ? '+' : ''}{m.delta}</b> },
    { h: 'Reason', cell: (m) => m.reason },
  ];

  return (
    <div>
      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${tab === 'low' ? 'on' : ''}`} onClick={() => setTab('low')}>Low stock</button>
          <button className={`tab ${tab === 'moves' ? 'on' : ''}`} onClick={() => setTab('moves')}>Stock history</button>
        </div>
        <div className="grow" />
        {tab === 'low' && <select className="input" style={{ width: 170 }} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}>
          {[0, 5, 10, 20, 50].map((n) => <option key={n} value={n}>{n === 0 ? 'Out of stock only' : `${n} or fewer`}</option>)}</select>}
        {tab === 'moves' && <select className="input" style={{ width: 220 }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">All products</option>{(prods.data?.items || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
        <button className="btn pri" onClick={() => openAdjust(null)}><Icon name="plus" size={16} /> Adjust stock</button>
      </div>

      {tab === 'low' ? (
        <>
          <ErrorBox error={low.error} onRetry={low.reload} />
          <div className="card flush"><div className="bd">
            {low.loading && !low.data ? <Loading /> : (low.data || []).length === 0 ? <Empty icon="package" text="Nothing is running low" /> : (
              <DataTable columns={lowCols} rows={low.data} mobile={(p) => (
                <div className="flex sp center gap"><div><b>{p.name}</b><div><Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock} left</Badge></div></div><button className="btn sm" onClick={() => openAdjust(p)}>Adjust</button></div>
              )} />
            )}
          </div></div>
        </>
      ) : (
        <>
          <ErrorBox error={moves.error} onRetry={moves.reload} />
          <div className="card flush"><div className="bd">
            {moves.loading && !moves.data ? <Loading /> : (moves.data || []).length === 0 ? <Empty icon="clock" text="No stock movements yet" /> : (
              <DataTable columns={moveCols} rows={moves.data.map((m, i) => ({ ...m, id: i }))} mobile={(m) => (
                <div><div className="flex sp"><b>{names[m.product_id] || `#${m.product_id}`}</b><b style={{ color: m.delta > 0 ? 'var(--green)' : 'var(--red)' }}>{m.delta > 0 ? '+' : ''}{m.delta}</b></div><div className="muted sm">{m.reason} · {dt(m.created_at)}</div></div>
              )} />
            )}
          </div></div>
        </>
      )}

      {open && (
        <Modal title="Adjust stock" onClose={() => setOpen(false)}
          footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn pri" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Apply'}</button></>}>
          {adj ? (
            <div className="flex sp center" style={{ marginBottom: 14 }}>
              <div><b>{adj.name}</b>{typeof adj.stock === 'number' && <div className="muted sm">Current stock: {num(adj.stock)}</div>}</div>
              <button className="btn sm" onClick={() => { setAdj(null); setPicker(true); }}>Change</button>
            </div>
          ) : (
            <Field label="Product">
              <SearchBox value={pickQ} onChange={setPickQ} placeholder="Search product…" />
              <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
                {(found.data?.items || []).map((p) => (
                  <div className="list-item" key={p.id} style={{ cursor: 'pointer' }} onClick={() => { setAdj(p); setPicker(false); }}>
                    <div className="grow"><b>{p.name}</b></div><span className="muted sm">stock {p.stock}</span>
                  </div>
                ))}
              </div>
            </Field>
          )}
          <div className="row2">
            <Field label="Change (+ add / − remove)"><input className="input" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. 20 or -3" /></Field>
            <Field label="Reason"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="New stock arrived" /></Field>
          </div>
          {adj && typeof adj.stock === 'number' && parseInt(delta, 10) ? <div className="muted sm">New stock will be <b>{adj.stock + parseInt(delta, 10)}</b></div> : null}
        </Modal>
      )}
    </div>
  );
}
