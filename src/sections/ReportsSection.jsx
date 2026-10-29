'use client';
/**
 * REPORTS — sales, orders summary, profit, top customers, low stock.
 * APIs: GET /admin/reports/sales (owner) · /orders-summary · /profit (owner) · /top-customers (owner) · /low-stock
 */
import { useState } from 'react';
import { AreaChart, Donut, HBars } from '@/components/charts';
import { Badge, DataTable, Empty, ErrorBox, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { METHOD_LABEL, label, money, num } from '@/lib/format';

const COLORS = ['#e83e8c', '#3b82f6', '#16a870', '#e29a0d', '#8b5cf6', '#06b6d4', '#e5484d'];

export default function ReportsSection() {
  const { isOwner } = useAuth();
  const [days, setDays] = useState(30);
  const own = (fn) => (isOwner ? fn() : Promise.resolve(null));

  const sales = useAsync(() => own(() => api('/admin/reports/sales', { query: { days } })), [days, isOwner]);
  const profit = useAsync(() => own(() => api('/admin/reports/profit', { query: { days } })), [days, isOwner]);
  const top = useAsync(() => own(() => api('/admin/reports/top-customers', { query: { days } })), [days, isOwner]);
  const summary = useAsync(() => api('/admin/reports/orders-summary', { query: { days } }), [days]);
  const low = useAsync(() => api('/admin/reports/low-stock', { query: { threshold: 5 } }), []);

  const pts = (sales.data?.daily || []).map((r) => ({ label: r.date.slice(5).replace('-', '/'), full: r.date, value: r.revenue, extra: `${r.orders} orders` }));
  const revenue = pts.reduce((a, p) => a + p.value, 0);
  const orders = (sales.data?.daily || []).reduce((a, r) => a + r.orders, 0);

  // status × payment_status rows -> per-status totals
  const byStatus = {};
  (summary.data?.rows || []).forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + r.count; });
  const statusSlices = Object.entries(byStatus).map(([k, v], i) => ({ label: label(k), value: v, color: COLORS[i % COLORS.length] }));

  return (
    <div>
      <div className="toolbar">
        <div className="seg">{[7, 30, 90, 365].map((n) => <button key={n} className={days === n ? 'on' : ''} onClick={() => setDays(n)}>{n === 365 ? '1 year' : `${n} days`}</button>)}</div>
      </div>
      {!isOwner && <div className="infobox">Sales, profit and top-customer reports are for the owner account. You can see the order summary and low stock below.</div>}

      {isOwner && (
        <>
          <div className="grid g4 mb">
            <Kpi l="Revenue" v={money(revenue)} />
            <Kpi l="Orders" v={num(orders)} />
            <Kpi l="Gross profit" v={profit.data ? money(profit.data.gross_profit) : '—'} />
            <Kpi l="Discounts given" v={profit.data ? money(profit.data.discounts_given) : '—'} />
          </div>
          <div className="card mb"><div className="hd"><h3>Revenue per day</h3></div><div className="bd">
            {sales.loading ? <Loading /> : sales.error ? <ErrorBox error={sales.error} onRetry={sales.reload} /> : <AreaChart points={pts} />}
          </div></div>

          <div className="grid g2 mb">
            <div className="card"><div className="hd"><h3>Top products</h3></div><div className="bd">
              {(sales.data?.top_products || []).length === 0 ? <Empty icon="box" text="No sales" /> : <HBars rows={sales.data.top_products.map((t) => ({ label: t.name, value: t.qty, sub: money(t.revenue) }))} fmt={(v) => `${num(v)} sold`} />}
            </div></div>
            <div className="card"><div className="hd"><h3>By payment method</h3></div><div className="bd">
              {(sales.data?.by_payment || []).length === 0 ? <Empty icon="card" text="No data" /> : <Donut centerLabel="Orders" slices={sales.data.by_payment.map((p, i) => ({ label: METHOD_LABEL[p.method] || p.method, value: p.orders, color: COLORS[i % COLORS.length] }))} />}
            </div></div>
          </div>

          <div className="grid g2 mb">
            <div className="card"><div className="hd"><h3>Profit</h3></div><div className="bd">
              {profit.loading ? <Loading /> : profit.data && (
                <>
                  <div className="sum-row"><span>Item revenue</span><b>{money(profit.data.item_revenue)}</b></div>
                  <div className="sum-row"><span>Item cost</span><b>−{money(profit.data.item_cost)}</b></div>
                  <div className="sum-row"><span>Discounts</span><b>−{money(profit.data.discounts_given)}</b></div>
                  <div className="sum-row tot"><span>Gross profit</span><span style={{ color: profit.data.gross_profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{money(profit.data.gross_profit)}</span></div>
                  <div className="muted sm" style={{ marginTop: 8 }}>Excludes ads, packaging and courier loss.</div>
                  {profit.data.products_missing_cost_price.length > 0 && (
                    <div className="infobox" style={{ marginTop: 10 }}>Add a cost price to: {profit.data.products_missing_cost_price.join(', ')}</div>
                  )}
                </>
              )}
            </div></div>
            <div className="card"><div className="hd"><h3>Top customers</h3></div><div className="bd">
              {top.loading ? <Loading /> : (top.data || []).length === 0 ? <Empty icon="users" text="No data" /> : top.data.map((c, i) => (
                <div className="list-item" key={c.id}><div className="avatar">{i + 1}</div><div className="grow"><b>{c.name || c.phone}</b><span className="muted sm">{c.phone} · {c.orders} orders</span></div><b>{money(c.spent)}</b></div>
              ))}
            </div></div>
          </div>
        </>
      )}

      <div className="grid g2">
        <div className="card"><div className="hd"><h3>Orders by status</h3></div><div className="bd">
          {summary.loading ? <Loading /> : statusSlices.length === 0 ? <Empty icon="cart" text="No orders" /> : <Donut slices={statusSlices} />}
        </div></div>
        <div className="card"><div className="hd"><h3>Low stock (5 or fewer)</h3></div><div className="bd">
          {low.loading ? <Loading /> : (low.data || []).length === 0 ? <Empty icon="package" text="All good" /> : low.data.slice(0, 10).map((p) => (
            <div className="list-item" key={p.id}><div className="grow"><b>{p.name}</b></div><Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock} left</Badge></div>
          ))}
        </div></div>
      </div>
    </div>
  );
}

function Kpi({ l, v }) {
  return <div className="card kpi"><div><div className="v">{v}</div><div className="l">{l}</div></div></div>;
}
