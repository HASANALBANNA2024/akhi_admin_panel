'use client';
/**
 * CUSTOMERS — search, detail (addresses, spend), order history, block / unblock.
 * APIs:
 *   GET   /admin/customers?q=&page=            (30 per page, plain array)
 *   GET   /admin/customers/{id}                 detail + addresses
 *   GET   /admin/customers/{id}/orders          order history
 *   PATCH /admin/customers/{id}/block?blocked=  block / unblock
 */
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, DataTable, Empty, ErrorBox, Loading, Modal, Pager, SearchBox } from '@/components/ui';
import { useConfirm, useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAsync, useDebounce } from '@/lib/hooks';
import { ORDER_TONE, dt, label, money } from '@/lib/format';

export default function CustomersSection() {
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  useEffect(() => setPage(1), [dq]);
  const list = useAsync(() => api('/admin/customers', { query: { q: dq, page } }), [dq, page]);
  const rows = list.data || [];

  async function block(c, v) {
    if (v && !(await confirm({ title: 'Block customer?', text: `${c.name || c.phone} will not be able to order.`, confirmText: 'Block', danger: true }))) return;
    try { await api(`/admin/customers/${c.id}/block`, { method: 'PATCH', query: { blocked: v } }); toast.ok(v ? 'Customer blocked' : 'Customer unblocked'); list.reload(); }
    catch (e) { toast.error(e.message); }
  }

  const columns = [
    { h: 'Customer', cell: (c) => <div className="cell-prod"><div className="avatar">{(c.name || c.phone).slice(0, 1).toUpperCase()}</div><div className="t"><b>{c.name || 'No name'}</b><small>{c.phone}</small></div></div> },
    { h: 'Orders', cell: (c) => c.orders },
    { h: 'Joined', cell: (c) => <span className="muted">{dt(c.joined, false)}</span> },
    { h: 'Status', cell: (c) => <Badge tone={c.is_blocked ? 'red' : 'green'}>{c.is_blocked ? 'Blocked' : 'Active'}</Badge> },
    {
      h: '', cls: 'r', noClick: true, cell: (c) => (
        <div className="acts">
          <button className="btn sm" onClick={() => setOpen(c.id)}><Icon name="eye" size={14} /> View</button>
          <button className={`btn sm ${c.is_blocked ? '' : 'danger'}`} onClick={() => block(c, !c.is_blocked)}>{c.is_blocked ? 'Unblock' : 'Block'}</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search by name or phone…" /></div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      <div className="card flush"><div className="bd">
        {list.loading && !list.data ? <Loading /> : rows.length === 0 && page === 1 ? <Empty icon="users" text="No customers found" /> : (
          <>
            <DataTable columns={columns} rows={rows} mobile={(c) => (
              <div>
                <div className="flex sp center"><div className="cell-prod"><div className="avatar">{(c.name || c.phone).slice(0, 1).toUpperCase()}</div><div className="t"><b>{c.name || 'No name'}</b><small>{c.phone} · {c.orders} orders</small></div></div><Badge tone={c.is_blocked ? 'red' : 'green'}>{c.is_blocked ? 'Blocked' : 'Active'}</Badge></div>
                <div className="flex gap" style={{ marginTop: 10 }}>
                  <button className="btn sm" onClick={() => setOpen(c.id)}>View</button>
                  <button className="btn sm" onClick={() => block(c, !c.is_blocked)}>{c.is_blocked ? 'Unblock' : 'Block'}</button>
                </div>
              </div>
            )} />
            <Pager page={page} pageSize={30} count={rows.length} onPage={setPage} />
          </>
        )}
      </div></div>
      {open && <CustomerDetail id={open} onClose={() => setOpen(null)} onBlock={block} />}
    </div>
  );
}

function CustomerDetail({ id, onClose, onBlock }) {
  const d = useAsync(() => api(`/admin/customers/${id}`), [id]);
  const o = useAsync(() => api(`/admin/customers/${id}/orders`), [id]);
  const c = d.data;
  return (
    <Modal title="Customer" size="wide" onClose={onClose}>
      {d.loading ? <Loading /> : d.error ? <ErrorBox error={d.error} /> : c && (
        <div>
          <div className="flex center gap wrap sp" style={{ marginBottom: 16 }}>
            <div className="cell-prod"><div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{(c.name || c.phone).slice(0, 1).toUpperCase()}</div>
              <div className="t"><b style={{ fontSize: 17 }}>{c.name || 'No name'}</b><small>{c.phone}{c.email ? ` · ${c.email}` : ''}</small></div></div>
            <div className="flex gap">
              <div className="card kpi"><div><div className="v">{c.orders}</div><div className="l">Orders</div></div></div>
              <div className="card kpi"><div><div className="v">{money(c.total_spent)}</div><div className="l">Total spent</div></div></div>
            </div>
          </div>
          <div className="flex gap center" style={{ marginBottom: 16 }}>
            <Badge tone={c.is_blocked ? 'red' : 'green'}>{c.is_blocked ? 'Blocked' : 'Active'}</Badge>
            <span className="muted sm">Joined {dt(c.joined, false)}</span>
            <div className="grow" />
            <button className="btn sm" onClick={async () => { await onBlock({ id: c.id, name: c.name, phone: c.phone }, !c.is_blocked); d.reload(); }}>{c.is_blocked ? 'Unblock' : 'Block'}</button>
          </div>
          <h4 style={{ marginBottom: 6 }}>Addresses</h4>
          {(c.addresses || []).length === 0 ? <div className="muted sm">No saved address</div> : c.addresses.map((a) => (
            <div className="list-item" key={a.id}><Icon name="map" /><div className="grow"><b>{a.recipient_name} · {a.phone}</b><span className="muted sm">{a.address_line}, {a.area ? `${a.area}, ` : ''}{a.district}</span></div>{a.is_default && <Badge tone="pink">Default</Badge>}</div>
          ))}
          <h4 style={{ margin: '18px 0 6px' }}>Order history</h4>
          {o.loading ? <Loading /> : (o.data || []).length === 0 ? <div className="muted sm">No orders</div> : o.data.map((x) => (
            <div className="list-item" key={x.order_no}><div className="grow"><b>{x.order_no}</b><span className="muted sm">{dt(x.created_at)}</span></div><Badge tone={ORDER_TONE[x.status]}>{label(x.status)}</Badge><b>{money(x.total)}</b></div>
          ))}
        </div>
      )}
    </Modal>
  );
}
