'use client';
/**
 * NOTIFICATIONS — new orders, payment checks, returns, chat.
 * APIs: GET /admin/notifications?unread_only= · PATCH /admin/notifications/{id}/read
 *       POST /admin/notifications/read-all · DELETE /admin/notifications/{id}
 */
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { Empty, ErrorBox, Loading } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { timeAgo } from '@/lib/format';

const KIND = {
  new_order: { icon: 'cart', bg: 'var(--blue-l)', c: 'var(--blue)' },
  payment_check: { icon: 'card', bg: 'var(--amber-l)', c: 'var(--amber)' },
  return: { icon: 'undo', bg: 'var(--red-l)', c: 'var(--red)' },
  chat: { icon: 'chat', bg: 'var(--pink-l)', c: 'var(--pink)' },
};
const hrefFor = (n) => (n.kind === 'new_order' && n.ref ? `/orders?open=${n.ref}` : n.kind === 'payment_check' ? '/payments' : n.kind === 'return' ? '/returns' : n.kind === 'chat' ? '/chat' : null);

export default function NotificationsSection() {
  const toast = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api('/admin/notifications', { query: { unread_only: unreadOnly } }), [unreadOnly]);
  const items = data?.items || [];

  const act = async (fn, msg) => { try { await fn(); if (msg) toast.ok(msg); reload(); } catch (e) { toast.error(e.message); } };

  return (
    <div>
      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${!unreadOnly ? 'on' : ''}`} onClick={() => setUnreadOnly(false)}>All</button>
          <button className={`tab ${unreadOnly ? 'on' : ''}`} onClick={() => setUnreadOnly(true)}>Unread {data?.unread ? `(${data.unread})` : ''}</button>
        </div>
        <div className="grow" />
        <button className="btn" disabled={!data?.unread} onClick={() => act(() => api('/admin/notifications/read-all', { method: 'POST' }), 'All marked as read')}><Icon name="check" size={15} /> Mark all read</button>
      </div>
      <ErrorBox error={error} onRetry={reload} />
      <div className="card flush"><div className="bd" style={{ padding: '0 18px' }}>
        {loading && !data ? <Loading /> : items.length === 0 ? <Empty icon="bell" text="No notifications" /> : items.map((n) => {
          const k = KIND[n.kind] || KIND.chat; const href = hrefFor(n);
          return (
            <div className="list-item" key={n.id} style={{ opacity: n.is_read ? .65 : 1 }}>
              <div className="avatar" style={{ background: k.bg, color: k.c }}><Icon name={k.icon} size={16} /></div>
              <div className="grow" style={{ whiteSpace: 'normal' }}>
                <div style={{ fontWeight: n.is_read ? 400 : 700 }}>{n.text}</div>
                <span className="muted sm">{timeAgo(n.created_at)}</span>
              </div>
              {href && <Link href={href} className="btn sm" onClick={() => !n.is_read && api(`/admin/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {})}>Open</Link>}
              {!n.is_read && <button className="btn sm" onClick={() => act(() => api(`/admin/notifications/${n.id}/read`, { method: 'PATCH' }))} aria-label="Mark read"><Icon name="check" size={14} /></button>}
              <button className="btn sm danger" onClick={() => act(() => api(`/admin/notifications/${n.id}`, { method: 'DELETE' }))} aria-label="Delete"><Icon name="trash" size={14} /></button>
            </div>
          );
        })}
      </div></div>
    </div>
  );
}
