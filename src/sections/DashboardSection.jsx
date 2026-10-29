'use client';
/**
 * DASHBOARD — everything for the dashboard lives in this one file.
 * APIs used:
 *   GET  /admin/dashboard                 KPIs, orders by status, low stock
 *   GET  /admin/reports/sales?days=N      sales chart + top products   (owner only)
 *   GET  /admin/orders?page_size=6        recent orders
 *   GET  /admin/payments/pending          payments waiting for check
 *   POST /admin/payments/{id}/approve|reject
 *   GET  /admin/chat/threads              recent messages
 *   GET  /admin/customers                 (counted page by page for "Total Customers")
 */
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { AreaChart, Donut } from '@/components/charts';
import { Badge, ErrorBox, Loading, Empty } from '@/components/ui';
import { useConfirm, useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { METHOD_LABEL, ORDER_TONE, dt, label, money, num, timeAgo } from '@/lib/format';

const STATUS_COLORS = {
  pending: '#e29a0d', confirmed: '#3b82f6', processing: '#06b6d4', shipped: '#8b5cf6', delivered: '#16a870', cancelled: '#e5484d',
};

async function countCustomers() {
  let total = 0;
  for (let p = 1; p <= 20; p++) {
    const rows = await api('/admin/customers', { query: { page: p } });
    total += rows.length;
    if (rows.length < 30) return { n: total, more: false };
  }
  return { n: total, more: true };
}

export default function DashboardSection() {
  const { isOwner } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [days, setDays] = useState(30);

  const main = useAsync(() => api('/admin/dashboard'), []);
  const sales = useAsync(() => (isOwner ? api('/admin/reports/sales', { query: { days } }) : Promise.resolve(null)), [days, isOwner]);
  const recent = useAsync(() => api('/admin/orders', { query: { page_size: 6 } }), []);
  const pays = useAsync(() => api('/admin/payments/pending'), []);
  const chats = useAsync(() => api('/admin/chat/threads', { query: { page_size: 5 } }).catch(() => []), []);
  const cust = useAsync(() => countCustomers().catch(() => null), []);

  async function review(p, action) {
    const ok = await confirm({
      title: `${action === 'approve' ? 'Approve' : 'Reject'} payment?`,
      text: `${label(p.method.replace('manual_', ''))} · ${money(p.amount)} · Order ${p.order_no} · TrxID ${p.trx_id || '—'}`,
      confirmText: action === 'approve' ? 'Approve' : 'Reject', danger: action === 'reject',
    });
    if (!ok) return;
    try {
      await api(`/admin/payments/${p.payment_id}/${action}`, { method: 'POST', body: {} });
      toast.ok(action === 'approve' ? 'Payment approved' : 'Payment rejected');
      pays.reload(); main.reload(); recent.reload();
    } catch (e) { toast.error(e.message); }
  }

  if (main.loading && !main.data) return <Loading />;
  if (main.error) return <ErrorBox error={main.error} onRetry={main.reload} />;
  const d = main.data;
  const byStatus = d.orders_by_status || {};
  const totalOrders = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const slices = Object.keys(STATUS_COLORS).map((k) => ({ label: label(k), value: byStatus[k] || 0, color: STATUS_COLORS[k] }));
  const pts = (sales.data?.daily || []).map((r) => ({
    label: r.date.slice(5).replace('-', '/'), full: r.date, value: r.revenue, extra: `${r.orders} orders`,
  }));
  const top = sales.data?.top_products || [];
  const pending = pays.data || [];
  const lowStock = d.low_stock || [];

  const KPIS = [
    { l: 'Total Revenue', v: money(d.paid_revenue), s: 'Paid orders', ic: 'wallet', c: 'var(--green)', bg: 'var(--green-l)' },
    { l: 'Total Orders', v: num(totalOrders), s: `${num(d.orders_today)} today`, ic: 'cart', c: 'var(--blue)', bg: 'var(--blue-l)' },
    { l: 'Orders Today', v: num(d.orders_today), s: 'Since midnight (UTC)', ic: 'clock', c: 'var(--purple)', bg: 'var(--purple-l)' },
    { l: 'Pending Payments', v: num(d.pending_payment_checks), s: 'Need verification', ic: 'card', c: 'var(--amber)', bg: 'var(--amber-l)' },
    { l: 'Total Customers', v: cust.data ? `${num(cust.data.n)}${cust.data.more ? '+' : ''}` : '—', s: 'Registered', ic: 'users', c: 'var(--pink)', bg: 'var(--pink-l)' },
    { l: 'Low Stock', v: num(lowStock.length), s: 'Items ≤ 5 left', ic: 'alert', c: 'var(--red)', bg: 'var(--red-l)' },
  ];

  return (
    <div>
      <div className="grid g6 mb">
        {KPIS.map((k) => (
          <div className="card kpi" key={k.l}>
            <div className="ic" style={{ background: k.bg, color: k.c }}><Icon name={k.ic} size={22} /></div>
            <div style={{ minWidth: 0 }}>
              <div className="v">{k.v}</div>
              <div className="l">{k.l}</div>
              <div className="s">{k.s}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid dash-main mb">
        <div className="card">
          <div className="hd">
            <h3>Sales Overview</h3>
            <div className="seg">
              {[7, 30, 90].map((n) => <button key={n} className={days === n ? 'on' : ''} onClick={() => setDays(n)}>{n} days</button>)}
            </div>
          </div>
          <div className="bd">
            {!isOwner ? <div className="infobox">The sales chart is available to the owner account only.</div>
              : sales.loading ? <Loading /> : sales.error ? <ErrorBox error={sales.error} onRetry={sales.reload} />
                : <AreaChart points={pts} />}
            {isOwner && sales.data && (
              <div className="flex gap wrap muted sm" style={{ marginTop: 8 }}>
                <span>Revenue in range: <b style={{ color: 'var(--ink)' }}>{money(pts.reduce((a, p) => a + p.value, 0))}</b></span>
                <span>Orders: <b style={{ color: 'var(--ink)' }}>{num((sales.data.daily || []).reduce((a, r) => a + r.orders, 0))}</b></span>
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="hd"><h3>Order Status</h3><Link href="/orders" className="btn sm">View all</Link></div>
          <div className="bd"><Donut slices={slices} /></div>
        </div>
      </div>

      <div className="grid g3 mb">
        <div className="card">
          <div className="hd"><h3>Top Selling Products</h3></div>
          <div className="bd">
            {!isOwner ? <div className="muted sm">Owner only.</div> : top.length === 0 ? <Empty icon="box" text="No sales in this period" /> : top.slice(0, 5).map((t, i) => (
              <div className="list-item" key={t.name}>
                <div className="avatar" style={{ borderRadius: 8 }}>{i + 1}</div>
                <div className="grow"><b>{t.name}</b><span className="muted sm">{num(t.qty)} sold</span></div>
                <b>{money(t.revenue)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="hd"><h3>Recent Orders</h3><Link href="/orders" className="btn sm">View all</Link></div>
          <div className="bd">
            {recent.loading ? <Loading /> : (recent.data?.items || []).length === 0 ? <Empty icon="cart" text="No orders yet" /> : recent.data.items.map((o) => (
              <Link href={`/orders?open=${o.order_no}`} className="list-item" key={o.order_no}>
                <div className="grow"><b>{o.order_no}</b><span className="muted sm">{o.ship_name} · {timeAgo(o.created_at)}</span></div>
                <div style={{ textAlign: 'right' }}><b>{money(o.total)}</b><br /><Badge tone={ORDER_TONE[o.status]}>{label(o.status)}</Badge></div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="hd"><h3>Payments to Verify</h3><Link href="/payments" className="btn sm">View all</Link></div>
          <div className="bd">
            {pays.loading ? <Loading /> : pending.length === 0 ? <Empty icon="card" text="All payments are verified" /> : pending.slice(0, 4).map((p) => (
              <div className="list-item" key={p.payment_id}>
                <div className="grow">
                  <b>{p.order_no}</b>
                  <span className="muted sm">{METHOD_LABEL[p.method] || p.method} · {p.trx_id || '—'}</span>
                </div>
                <b>{money(p.amount)}</b>
                <button className="btn sm ok" onClick={() => review(p, 'approve')} aria-label="Approve"><Icon name="check" size={14} /></button>
                <button className="btn sm danger" onClick={() => review(p, 'reject')} aria-label="Reject"><Icon name="x" size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid g3">
        <div className="card">
          <div className="hd"><h3>Low Stock Alert</h3><Link href="/inventory" className="btn sm">Manage</Link></div>
          <div className="bd">
            {lowStock.length === 0 ? <Empty icon="package" text="Stock levels look good" /> : lowStock.slice(0, 6).map((p) => (
              <div className="list-item" key={p.id}>
                <div className="grow"><b>{p.name}</b></div>
                <Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="hd"><h3>Recent Messages</h3><Link href="/chat" className="btn sm">Open chat</Link></div>
          <div className="bd">
            {chats.loading ? <Loading /> : (chats.data || []).length === 0 ? <Empty icon="chat" text="No messages" /> : chats.data.map((t) => (
              <Link href="/chat" className="list-item" key={t.id}>
                <div className="avatar">{(t.name || '?').slice(0, 1).toUpperCase()}</div>
                <div className="grow"><b>{t.name}</b><span className="muted sm">{t.last_text || '—'}</span></div>
                {t.unread > 0 && <span className="badge pink">{t.unread}</span>}
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="hd"><h3>Quick Actions</h3></div>
          <div className="bd">
            <div className="grid g2" style={{ gap: 10 }}>
              {[
                ['/products?new=1', 'plus', 'Add Product'],
                ['/orders', 'cart', 'View Orders'],
                ['/coupons', 'ticket', 'Coupons'],
                ['/banners', 'image', 'Banners'],
                ['/customers', 'users', 'Customers'],
                ['/settings', 'cog', 'Settings'],
              ].map(([href, ic, t]) => (
                <Link className="qa" href={href} key={t}><Icon name={ic} size={22} />{t}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
