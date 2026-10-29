'use client';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { Modal } from './ui';

const ToastCtx = createContext(null);
const ConfirmCtx = createContext(null);

export function useToast() { return useContext(ToastCtx); }
export function useConfirm() { return useContext(ConfirmCtx); }

export default function Providers({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(1);
  const [dlg, setDlg] = useState(null);

  const push = useCallback((kind, text) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'err' ? 6000 : 3200);
  }, []);

  const toast = useMemo(() => ({
    ok: (m) => push('ok', m), error: (m) => push('err', m),
  }), [push]);

  /** const ok = await confirm({ title, text, confirmText, danger }) */
  const confirm = useCallback((opts) => new Promise((resolve) => setDlg({ ...opts, resolve })), []);
  const close = (v) => { dlg?.resolve(v); setDlg(null); };

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.kind}`}>
              <Icon name={t.kind === 'ok' ? 'check' : 'alert'} size={16} /> {t.text}
            </div>
          ))}
        </div>
        {dlg && (
          <Modal title={dlg.title || 'Are you sure?'} onClose={() => close(false)}
            footer={<>
              <button className="btn" onClick={() => close(false)}>Cancel</button>
              <button className={`btn ${dlg.danger ? 'danger' : 'pri'}`} onClick={() => close(true)}>{dlg.confirmText || 'Confirm'}</button>
            </>}>
            <div>{dlg.text}</div>
          </Modal>
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}
