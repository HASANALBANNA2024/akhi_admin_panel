/**
 * Tiny API client used by every section.
 * - Base path is /api/v1 (Next.js forwards it to the FastAPI backend, see next.config.js).
 * - Sends the admin token automatically.
 * - Throws Error(message) with the backend's "detail" text, so sections can show it in a toast.
 */
const BASE = '/api/v1';
const TOKEN_KEY = 'akhi_admin_token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage blocked: ignore */ }
}

/** Reads username / role / expiry from the JWT payload (no secret needed, display only). */
export function readSession() {
  const t = getToken();
  if (!t) return null;
  try {
    const part = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(part).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const p = JSON.parse(json);
    if (p.exp && p.exp * 1000 < Date.now()) return null;
    return { username: p.sub, role: p.arole || 'staff', exp: p.exp };
  } catch { return null; }
}

function buildUrl(path, query) {
  const qs = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  const s = qs.toString();
  return `${BASE}${path}${s ? `?${s}` : ''}`;
}

function errorText(data, status) {
  const d = data && data.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => `${(x.loc || []).slice(1).join('.')}: ${x.msg}`).join('; ');
  return `Request failed (${status})`;
}

function onUnauthorized() {
  setToken(null);
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

/**
 * api('/admin/products', { query: { q: 'clip' } })
 * api('/admin/products', { method: 'POST', body: {...} })
 * api('/admin/upload', { method: 'POST', form: formData })
 */
export async function api(path, { method = 'GET', body, query, form, auth = true } = {}) {
  const headers = {};
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: payload });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && auth) { onUnauthorized(); throw new Error('Session expired. Please sign in again.'); }
  if (!res.ok) throw new Error(errorText(data, res.status));
  return data;
}

/** Downloads a file response (CSV) with the auth header, then saves it in the browser. */
export async function download(path, filename, query) {
  const token = getToken();
  const res = await fetch(buildUrl(path, query), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (res.status === 401) { onUnauthorized(); throw new Error('Session expired.'); }
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Uploaded images come back as absolute URLs. Showing them through /uploads keeps them working on any host. */
export function assetUrl(u) {
  if (!u) return '';
  const i = u.indexOf('/uploads/');
  return i >= 0 ? u.slice(i) : u;
}

/** Uploads one image file and returns its public URL. (POST /admin/upload) */
export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  const r = await api('/admin/upload', { method: 'POST', form: fd });
  return r.url;
}
