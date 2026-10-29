'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks { data, loading, error }.
 * Re-runs when `deps` change. Call reload() after a change to refresh.
 *   const { data, loading, error, reload } = useAsync(() => api('/admin/coupons'), []);
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await fnRef.current();
      if (id === seq.current) setState({ data, loading: false, error: '' });
    } catch (e) {
      if (id === seq.current) setState({ data: null, loading: false, error: e.message || String(e) });
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

export function useDebounce(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Keeps a "busy" flag around an async action. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn) => {
    setBusy(true);
    try { return await fn(); } finally { setBusy(false); }
  }, []);
  return [busy, run];
}
