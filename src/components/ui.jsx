'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { assetUrl, uploadImage } from '@/lib/api';
import { useToast } from './Providers';

export function Loading() { return <div className="loading"><span className="spin" /></div>; }

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="errbox">
      <Icon name="alert" />
      <span style={{ flex: 1 }}>{error}</span>
      {onRetry && <button className="btn sm" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function Empty({ icon = 'box', text = 'Nothing here yet' }) {
  return <div className="empty"><Icon name={icon} size={34} /><div>{text}</div></div>;
}

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Switch({ checked, onChange, disabled }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </label>
  );
}

export function Stars({ n }) {
  return <span className="stars">{'★'.repeat(n || 0)}{'☆'.repeat(Math.max(0, 5 - (n || 0)))}</span>;
}

export function Thumb({ src, size, icon = 'image' }) {
  return (
    <div className={`thumb ${size === 'lg' ? 'lg' : ''}`}>
      {src ? <img src={assetUrl(src)} alt="" /> : <Icon name={icon} />}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search">
      <Icon name="search" size={16} />
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function Pager({ page, pageSize, total, count, onPage }) {
  // `total` is known for some lists (products, orders). For plain arrays we only know "is there a next page".
  const hasTotal = typeof total === 'number';
  const from = count ? (page - 1) * pageSize + 1 : 0;
  const to = (page - 1) * pageSize + (count || 0);
  const hasNext = hasTotal ? to < total : count >= pageSize;
  return (
    <div className="pager">
      <span className="muted sm">{hasTotal ? `${from}–${to} of ${total}` : `Page ${page}`}</span>
      <div className="flex gap">
        <button className="btn sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
        <button className="btn sm" disabled={!hasNext} onClick={() => onPage(page + 1)}>Next →</button>
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, size }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size || ''}`} role="dialog" aria-modal="true">
        <div className="mh">
          <h3>{title}</h3>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="mb2">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  );
}

/** Multi-image uploader. value = array of urls. Uses POST /admin/upload for each file. */
export function ImageUploader({ value, onChange, max = 8, single = false }) {
  const toast = useToast();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const list = value || [];

  async function pick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      const added = [];
      const failed = [];
      for (const f of files.slice(0, single ? 1 : max - list.length)) {
        try { added.push(await uploadImage(f)); } catch (err) { failed.push(`${f.name}: ${err.message}`); }
      }
      // keep every image that did upload, even if another one failed
      if (added.length) await onChange(single ? added : [...list, ...added]);
      if (failed.length) toast.error(failed.join(' | '));
    } finally { setBusy(false); }
  }

  function move(i, dir) {
    const a = [...list]; const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; onChange(a);
  }

  return (
    <div>
      <div className="imgs">
        {list.map((u, i) => (
          <div className="im" key={u + i}>
            <img src={assetUrl(u)} alt="" />
            {i === 0 && !single && <span className="first">Main</span>}
            <button type="button" onClick={() => onChange(list.filter((_, k) => k !== i))} aria-label="Remove"><Icon name="x" size={13} /></button>
            {!single && list.length > 1 && (
              <div style={{ position: 'absolute', bottom: 3, right: 3, display: 'flex', gap: 2 }}>
                {i > 0 && <button type="button" style={{ position: 'static', width: 20, height: 20 }} onClick={() => move(i, -1)} aria-label="Move left">‹</button>}
                {i < list.length - 1 && <button type="button" style={{ position: 'static', width: 20, height: 20 }} onClick={() => move(i, 1)} aria-label="Move right">›</button>}
              </div>
            )}
          </div>
        ))}
        {(single ? list.length === 0 : list.length < max) && (
          <button type="button" className="add" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? <span className="spin" /> : <span><Icon name="upload" /><br />Upload</span>}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" multiple={!single} hidden onChange={pick} />
      <div className="hint muted sm" style={{ marginTop: 6 }}>JPG, PNG or WEBP. {single ? '' : 'First image is the main one.'}</div>
    </div>
  );
}

/** Responsive table helper: pass columns [{h, cell(row), cls}], rows, and optional mobile card renderer. */
export function DataTable({ columns, rows, rowKey = 'id', mobile, onRowClick, compact }) {
  return (
    <div className={`tbl-wrap ${mobile ? 'cards' : ''}`}>
      <table className={`tbl ${compact ? 'compact' : ''}`}>
        <thead><tr>{columns.map((c, i) => <th key={i} className={c.cls}>{c.h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r[rowKey] ?? ri}>
              {columns.map((c, i) => (
                <td key={i} className={`${c.cls || ''} ${onRowClick && !c.noClick ? 'click' : ''}`}
                  onClick={onRowClick && !c.noClick ? () => onRowClick(r) : undefined}>{c.cell(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {mobile && <div className="cardlist">{rows.map((r, ri) => <div className="ci" key={r[rowKey] ?? ri}>{mobile(r)}</div>)}</div>}
    </div>
  );
}
