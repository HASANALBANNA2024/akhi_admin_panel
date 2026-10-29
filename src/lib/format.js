/** Formatting helpers + label/colour maps shared by all sections. */

export function money(n) {
  const v = Number(n || 0);
  return '৳' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function num(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

export function dt(v, withTime = true) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return d.toLocaleString('en-GB', opts);
}

export function timeAgo(v) {
  if (!v) return '';
  const s = Math.max(0, (Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return dt(v, false);
}

/** yyyy-mm-ddThh:mm for <input type="datetime-local"> */
export function toLocalInput(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function slugify(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9\u0980-\u09ff]+/g, '-').replace(/^-+|-+$/g, '');
}

export function getParam(name) {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) || '';
}

export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
export const PAYMENT_STATUSES = ['unpaid', 'pending_verification', 'paid', 'refunded'];

export const ORDER_TONE = {
  pending: 'amber', confirmed: 'blue', processing: 'blue', shipped: 'purple', delivered: 'green', cancelled: 'red',
};
export const PAYMENT_TONE = {
  unpaid: 'gray', pending_verification: 'amber', paid: 'green', refunded: 'red', pending: 'amber', approved: 'green', rejected: 'red',
};
export const RETURN_TONE = { requested: 'amber', approved: 'blue', rejected: 'red', refunded: 'green', cancelled: 'gray' };

export const METHOD_LABEL = {
  cod: 'Cash on delivery', sslcommerz: 'SSLCommerz', manual_bkash: 'bKash (manual)', manual_nagad: 'Nagad (manual)',
};

export function label(s) {
  return String(s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
