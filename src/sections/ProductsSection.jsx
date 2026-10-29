'use client';
/**
 * PRODUCTS — list, search, add, edit, images, stock, active toggle, delete.
 * APIs used:
 *   GET    /admin/products?q=&page=&page_size=        list
 *   GET    /admin/products/{id}                        load for edit
 *   POST   /admin/products                             create
 *   PUT    /admin/products/{id}                        update
 *   PATCH  /admin/products/{id}/stock?stock=           quick stock
 *   PATCH  /admin/products/{id}/active?active=         show / hide
 *   DELETE /admin/products/{id}                        deactivate (soft delete)
 *   POST   /admin/products/{id}/images                 add image (edit mode)
 *   DELETE /admin/products/{id}/images/{imageId}       remove image (edit mode)
 *   POST   /admin/upload                               upload file
 *   GET    /admin/categories                           category dropdown
 */
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, DataTable, Empty, ErrorBox, Field, ImageUploader, Loading, Pager, SearchBox, Switch, Thumb } from '@/components/ui';
import { useConfirm, useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAsync, useDebounce } from '@/lib/hooks';
import { getParam, money, num, slugify } from '@/lib/format';

const PAGE = 20;
const EMPTY = {
  name: '', slug: '', category_id: '', description: '', price: '', compare_at_price: '', cost_price: '',
  stock: 0, sku: '', is_active: true,
};

export default function ProductsSection() {
  const [view, setView] = useState('list'); // list | form
  const [editId, setEditId] = useState(null);

  useEffect(() => { if (getParam('new')) { setEditId(null); setView('form'); } }, []);

  if (view === 'form') {
    return <ProductForm id={editId} onDone={() => { setView('list'); setEditId(null); }} />;
  }
  return <ProductList onAdd={() => { setEditId(null); setView('form'); }} onEdit={(id) => { setEditId(id); setView('form'); }} />;
}

/* ============================== LIST ============================== */
function ProductList({ onAdd, onEdit }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');

  useEffect(() => { setPage(1); }, [dq]);
  const list = useAsync(() => api('/admin/products', { query: { q: dq, page, page_size: PAGE } }), [dq, page]);
  const cats = useAsync(() => api('/admin/categories'), []);
  const catName = useMemo(() => Object.fromEntries((cats.data || []).map((c) => [c.id, c.name])), [cats.data]);

  const items = (list.data?.items || []).filter((p) => (
    filter === 'all' ? true : filter === 'active' ? p.is_active : filter === 'hidden' ? !p.is_active : p.stock <= 5
  ));

  async function toggle(p, v) {
    try { await api(`/admin/products/${p.id}/active`, { method: 'PATCH', query: { active: v } }); toast.ok(v ? 'Product is now visible' : 'Product hidden'); list.reload(); }
    catch (e) { toast.error(e.message); }
  }
  async function setStock(p, v) {
    const n = Math.max(0, parseInt(v, 10));
    if (Number.isNaN(n) || n === p.stock) return;
    try { await api(`/admin/products/${p.id}/stock`, { method: 'PATCH', query: { stock: n } }); toast.ok('Stock updated'); list.reload(); }
    catch (e) { toast.error(e.message); }
  }
  async function remove(p) {
    if (!(await confirm({ title: 'Delete product?', text: `"${p.name}" will be hidden from the shop. Past orders keep their history.`, confirmText: 'Delete', danger: true }))) return;
    try { await api(`/admin/products/${p.id}`, { method: 'DELETE' }); toast.ok('Product removed'); list.reload(); }
    catch (e) { toast.error(e.message); }
  }

  const Stock = ({ p }) => (
    <input className="input" type="number" min="0" defaultValue={p.stock} key={`${p.id}-${p.stock}`} style={{ width: 84, padding: '6px 8px' }}
      onBlur={(e) => setStock(p, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} aria-label="Stock" />
  );
  const Name = ({ p }) => (
    <div className="cell-prod">
      <Thumb src={p.images?.[0]?.url} />
      <div className="t"><b>{p.name}</b><small>{p.sku ? `SKU ${p.sku} · ` : ''}{catName[p.category_id] || 'No category'}</small></div>
    </div>
  );

  const columns = [
    { h: 'Product', cell: (p) => <Name p={p} />, noClick: true },
    { h: 'Price', cell: (p) => <div><b>{money(p.price)}</b>{p.compare_at_price ? <div className="muted sm"><s>{money(p.compare_at_price)}</s></div> : null}</div> },
    { h: 'Stock', cell: (p) => <Stock p={p} />, noClick: true },
    { h: 'Status', cell: (p) => <div className="flex center gap"><Switch checked={p.is_active} onChange={(v) => toggle(p, v)} /><span className="muted sm">{p.is_active ? 'Active' : 'Hidden'}</span></div>, noClick: true },
    {
      h: '', cls: 'r', noClick: true, cell: (p) => (
        <div className="acts">
          <button className="btn sm" onClick={() => onEdit(p.id)}><Icon name="edit" size={14} /> Edit</button>
          <button className="btn sm danger" onClick={() => remove(p)} aria-label="Delete"><Icon name="trash" size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search products…" />
        <div className="tabs">
          {[['all', 'All'], ['active', 'Active'], ['hidden', 'Hidden'], ['low', 'Low stock']].map(([k, t]) => (
            <button key={k} className={`tab ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{t}</button>
          ))}
        </div>
        <div className="grow" />
        <button className="btn pri" onClick={onAdd}><Icon name="plus" size={16} /> Add Product</button>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      <div className="card flush"><div className="bd">
        {list.loading && !list.data ? <Loading /> : items.length === 0 ? <Empty icon="box" text="No products found" /> : (
          <>
            <DataTable columns={columns} rows={items} mobile={(p) => (
              <div>
                <Name p={p} />
                <div className="flex sp center" style={{ marginTop: 10 }}>
                  <b>{money(p.price)}</b>
                  <div className="flex center gap">Stock <Stock p={p} /></div>
                </div>
                <div className="flex sp center" style={{ marginTop: 10 }}>
                  <div className="flex center gap"><Switch checked={p.is_active} onChange={(v) => toggle(p, v)} /><span className="muted sm">{p.is_active ? 'Active' : 'Hidden'}</span></div>
                  <div className="flex gap">
                    <button className="btn sm" onClick={() => onEdit(p.id)}>Edit</button>
                    <button className="btn sm danger" onClick={() => remove(p)}><Icon name="trash" size={14} /></button>
                  </div>
                </div>
              </div>
            )} />
            <Pager page={page} pageSize={PAGE} total={list.data?.total} count={(list.data?.items || []).length} onPage={setPage} />
          </>
        )}
      </div></div>
    </div>
  );
}

/* ============================== FORM (add + edit) ============================== */
function ProductForm({ id, onDone }) {
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [images, setImages] = useState([]);       // urls, in display order
  const [idMap, setIdMap] = useState({});          // url -> image id (edit mode)
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const cats = useAsync(() => api('/admin/categories'), []);
  const loaded = useAsync(() => (id ? api(`/admin/products/${id}`) : Promise.resolve(null)), [id]);

  useEffect(() => {
    const p = loaded.data;
    if (!p) return;
    setF({
      name: p.name, slug: p.slug, category_id: p.category_id ?? '', description: p.description || '',
      price: p.price, compare_at_price: p.compare_at_price ?? '', cost_price: p.cost_price ?? '',
      stock: p.stock, sku: p.sku || '', is_active: p.is_active,
    });
    const imgs = [...(p.images || [])].sort((a, b) => a.sort_order - b.sort_order);
    setImages(imgs.map((i) => i.url));
    setIdMap(Object.fromEntries(imgs.map((i) => [i.url, i.id])));
    setSlugTouched(true);
  }, [loaded.data]);

  const set = (k) => (e) => {
    const v = e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setF((s) => {
      const n = { ...s, [k]: v };
      if (k === 'name' && !slugTouched) n.slug = slugify(v);
      return n;
    });
    if (k === 'slug') setSlugTouched(true);
  };

  /** In edit mode images are added/removed on the server immediately; in create mode they are sent with Save. */
  async function onImages(next) {
    if (!id) { setImages(next); return; }
    try {
      const removed = images.filter((u) => !next.includes(u));
      const added = next.filter((u) => !images.includes(u));
      const map = { ...idMap };
      for (const u of removed) { if (map[u]) await api(`/admin/products/${id}/images/${map[u]}`, { method: 'DELETE' }); delete map[u]; }
      for (const u of added) { const r = await api(`/admin/products/${id}/images`, { method: 'POST', body: { url: u } }); map[u] = r.id; }
      setIdMap(map); setImages(next);
    } catch (e) { toast.error(e.message); }
  }

  async function save(e) {
    e.preventDefault();
    if (!f.name.trim() || !f.slug.trim()) return toast.error('Name and slug are required');
    if (!(Number(f.price) > 0)) return toast.error('Price must be greater than 0');
    const body = {
      category_id: f.category_id === '' ? null : Number(f.category_id),
      name: f.name.trim(), slug: f.slug.trim(), description: f.description || null,
      price: Number(f.price),
      compare_at_price: f.compare_at_price === '' ? null : Number(f.compare_at_price),
      cost_price: f.cost_price === '' ? null : Number(f.cost_price),
      stock: Math.max(0, parseInt(f.stock, 10) || 0), sku: f.sku.trim() || null,
      is_active: !!f.is_active, image_urls: images,
    };
    setBusy(true);
    try {
      if (id) await api(`/admin/products/${id}`, { method: 'PUT', body });
      else await api('/admin/products', { method: 'POST', body });
      toast.ok(id ? 'Product updated' : 'Product created');
      onDone();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  if (id && loaded.loading) return <Loading />;
  if (id && loaded.error) return <ErrorBox error={loaded.error} onRetry={loaded.reload} />;

  const margin = f.price && f.cost_price ? Number(f.price) - Number(f.cost_price) : null;

  return (
    <form onSubmit={save}>
      <div className="toolbar">
        <button type="button" className="btn" onClick={onDone}><Icon name="back" size={16} /> Back</button>
        <h2 style={{ fontSize: 18 }}>{id ? 'Edit Product' : 'Add Product'}</h2>
        <div className="grow" />
        <button type="button" className="btn" onClick={onDone}>Cancel</button>
        <button className="btn pri" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Create product'}</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }} data-stack>
        <style>{'@media (max-width:1000px){[data-stack]{grid-template-columns:minmax(0,1fr)!important}}'}</style>
        <div className="grid">
          <div className="card"><div className="hd"><h3>Basic information</h3></div><div className="bd">
            <Field label="Product name *"><input className="input" value={f.name} onChange={set('name')} required placeholder="e.g. Velvet scrunchie set" /></Field>
            <div className="row2">
              <Field label="URL slug *" hint="Used in the product link"><input className="input" value={f.slug} onChange={set('slug')} required /></Field>
              <Field label="Category">
                <select className="input" value={f.category_id} onChange={set('category_id')}>
                  <option value="">— No category —</option>
                  {(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description"><textarea className="input" rows={6} value={f.description} onChange={set('description')} placeholder="Material, size, what is in the pack…" /></Field>
          </div></div>

          <div className="card"><div className="hd"><h3>Images</h3></div><div className="bd">
            <ImageUploader value={images} onChange={onImages} />
            {id && <div className="muted sm" style={{ marginTop: 6 }}>Added or removed images are saved immediately. Reordering is saved with “Save changes”.</div>}
          </div></div>
        </div>

        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card"><div className="hd"><h3>Pricing</h3></div><div className="bd">
            <Field label="Selling price (৳) *"><input className="input" type="number" min="0" step="0.01" value={f.price} onChange={set('price')} required /></Field>
            <Field label="Compare-at price (৳)" hint="Old price shown struck through"><input className="input" type="number" min="0" step="0.01" value={f.compare_at_price} onChange={set('compare_at_price')} /></Field>
            <Field label="Cost price (৳)" hint="Only you see this; used for profit report"><input className="input" type="number" min="0" step="0.01" value={f.cost_price} onChange={set('cost_price')} /></Field>
            {margin !== null && <div className="muted sm">Margin per item: <b style={{ color: margin >= 0 ? 'var(--green)' : 'var(--red)' }}>{money(margin)}</b></div>}
          </div></div>
          <div className="card"><div className="hd"><h3>Inventory</h3></div><div className="bd">
            <div className="row2">
              <Field label="Stock"><input className="input" type="number" min="0" value={f.stock} onChange={set('stock')} /></Field>
              <Field label="SKU"><input className="input" value={f.sku} onChange={set('sku')} /></Field>
            </div>
            <label className="check"><input type="checkbox" checked={f.is_active} onChange={set('is_active')} /> Visible in the shop</label>
          </div></div>
        </div>
      </div>
    </form>
  );
}
