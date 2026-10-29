'use client';
/**
 * REVIEWS — moderate customer reviews.
 * APIs: GET /admin/reviews?visible=&page= (30/page) · PATCH /admin/reviews/{id}?visible= · DELETE /admin/reviews/{id}
 *       GET /admin/products (only to show product names)
 */
import { useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, Empty, ErrorBox, Loading, Pager, Stars } from '@/components/ui';
import { useConfirm, useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { dt } from '@/lib/format';

export default function ReviewsSection() {
  const toast = useToast();
  const confirm = useConfirm();
  const [vis, setVis] = useState('');
  const [page, setPage] = useState(1);
  const list = useAsync(() => api('/admin/reviews', { query: { visible: vis, page } }), [vis, page]);
  const prods = useAsync(() => api('/admin/products', { query: { page_size: 100 } }).catch(() => ({ items: [] })), []);
  const names = useMemo(() => Object.fromEntries((prods.data?.items || []).map((p) => [p.id, p.name])), [prods.data]);
  const rows = list.data || [];

  async function setVisible(r, v) {
    try { await api(`/admin/reviews/${r.id}`, { method: 'PATCH', query: { visible: v } }); toast.ok(v ? 'Review is now visible' : 'Review hidden'); list.reload(); }
    catch (e) { toast.error(e.message); }
  }
  async function remove(r) {
    if (!(await confirm({ title: 'Delete review?', text: 'This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
    try { await api(`/admin/reviews/${r.id}`, { method: 'DELETE' }); toast.ok('Review deleted'); list.reload(); } catch (e) { toast.error(e.message); }
  }

  return (
    <div>
      <div className="toolbar">
        <div className="tabs">
          {[['', 'All'], ['true', 'Visible'], ['false', 'Hidden']].map(([k, t]) => (
            <button key={t} className={`tab ${vis === k ? 'on' : ''}`} onClick={() => { setVis(k); setPage(1); }}>{t}</button>
          ))}
        </div>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      <div className="card flush"><div className="bd" style={{ padding: '0 18px' }}>
        {list.loading && !list.data ? <Loading /> : rows.length === 0 ? <Empty icon="star" text="No reviews" /> : rows.map((r) => (
          <div className="list-item" key={r.id} style={{ alignItems: 'flex-start' }}>
            <div className="grow" style={{ whiteSpace: 'normal' }}>
              <div className="flex gap center wrap"><Stars n={r.rating} /><b style={{ display: 'inline' }}>{names[r.product_id] || `Product #${r.product_id}`}</b><Badge tone={r.is_visible ? 'green' : 'gray'}>{r.is_visible ? 'Visible' : 'Hidden'}</Badge></div>
              <div style={{ margin: '5px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.comment || <span className="muted">No comment</span>}</div>
              <span className="muted sm">{dt(r.created_at)}</span>
            </div>
            <div className="flex gap">
              <button className="btn sm" onClick={() => setVisible(r, !r.is_visible)}><Icon name="eye" size={14} /> {r.is_visible ? 'Hide' : 'Show'}</button>
              <button className="btn sm danger" onClick={() => remove(r)} aria-label="Delete"><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
      </div>
        {rows.length > 0 || page > 1 ? <Pager page={page} pageSize={30} count={rows.length} onPage={setPage} /> : null}
      </div>
    </div>
  );
}
