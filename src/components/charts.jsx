'use client';
import { useEffect, useRef, useState } from 'react';
import { money, num } from '@/lib/format';

/** Smooth area/line chart. points = [{label, value, extra}] */
export function AreaChart({ points, height = 240, color = '#e83e8c', fmt = money }) {
  const [hover, setHover] = useState(null);
  const box = useRef(null);
  const [W, setW] = useState(720); // real pixel width of the container, so text stays readable on phones
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const set = () => setW(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    set();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [points && points.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const H = W < 480 ? Math.min(height, 200) : height, PL = W < 480 ? 40 : 52, PR = 12, PT = 14, PB = 30;
  if (!points || points.length === 0) return <div className="empty" ref={box}>No data for this period</div>;
  const max = Math.max(...points.map((p) => p.value), 1);
  const niceMax = niceCeil(max);
  const x = (i) => PL + (points.length === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (points.length - 1));
  const y = (v) => PT + (H - PT - PB) * (1 - v / niceMax);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${H - PB} L${x(0)},${H - PB} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * niceMax);
  const step = Math.max(1, Math.ceil(points.length / (W < 480 ? 4 : 7)));
  const h = hover != null ? points[hover] : null;

  return (
    <div style={{ position: 'relative' }} ref={box}>
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sales chart"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - PL) / (W - PL - PR)) * (points.length - 1));
          setHover(Math.min(points.length - 1, Math.max(0, i)));
        }}>
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".28" /><stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="#eceef5" />
            <text x={PL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#8a8fa8">{compact(t)}</text>
          </g>
        ))}
        {points.map((p, i) => i % step === 0 && (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#8a8fa8">{p.label}</text>
        ))}
        <path d={area} fill="url(#ag)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} stroke={color} strokeDasharray="3 3" opacity=".6" />
            <circle cx={x(hover)} cy={y(h.value)} r="5" fill="#fff" stroke={color} strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {h && (
        <div style={{
          position: 'absolute', top: 0, left: `${(x(hover) / W) * 100}%`, transform: 'translateX(-50%)',
          background: '#14172e', color: '#fff', padding: '6px 10px', borderRadius: 8, fontSize: 12, pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          <b>{fmt(h.value)}</b><br /><span style={{ opacity: .7 }}>{h.full || h.label}{h.extra ? ` · ${h.extra}` : ''}</span>
        </div>
      )}
    </div>
  );
}

/** Donut. slices = [{label, value, color}] */
export function Donut({ slices, size = 170, centerLabel = 'Orders' }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const R = 62, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="donut-row">
      <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="Order status">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#eef0f5" strokeWidth="20" />
        {total > 0 && slices.filter((s) => s.value > 0).map((s) => {
          const len = (s.value / total) * C;
          const el = (
            <circle key={s.label} cx="80" cy="80" r={R} fill="none" stroke={s.color} strokeWidth="20"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 80 80)" />
          );
          off += len;
          return el;
        })}
        <text x="80" y="78" textAnchor="middle" fontSize="24" fontWeight="800" fill="#1d2036">{num(total)}</text>
        <text x="80" y="98" textAnchor="middle" fontSize="11" fill="#7a7f98">{centerLabel}</text>
      </svg>
      <div className="legend">
        {slices.map((s) => (
          <div className="li" key={s.label}><i style={{ background: s.color }} /><span>{s.label}</span><span>{num(s.value)}</span></div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars. rows = [{label, value, sub}] */
export function HBars({ rows, fmt = num, color = 'var(--pink)' }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} style={{ marginBottom: 12 }}>
          <div className="flex sp sm"><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{r.label}</span><b>{fmt(r.value)}</b></div>
          <div className="bar"><i style={{ width: `${(r.value / max) * 100}%`, background: color }} /></div>
          {r.sub && <div className="muted sm">{r.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function niceCeil(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * p;
}
function compact(v) {
  if (v >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(v));
}
