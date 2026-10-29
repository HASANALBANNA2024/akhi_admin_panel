'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { session, login } = useAuth();
  const router = useRouter();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (session) router.replace('/dashboard'); }, [session, router]);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await login(u.trim(), p); router.replace('/dashboard'); }
    catch (x) { setErr(x.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="login">
      <div className="art">
        <div className="flex center gap">
          <div className="avatar" style={{ background: 'var(--pink)', color: '#fff', width: 44, height: 44 }}><Icon name="star" size={22} /></div>
          <b style={{ fontSize: 20 }}>Akhi Lifestyle</b>
        </div>
        <h2>Run your shop,<br />all in one place.</h2>
        <p>Orders, payments, products, customers and chat — manage everything from this panel.</p>
      </div>
      <div className="box">
        <form onSubmit={submit}>
          <h2 style={{ fontSize: 24, marginBottom: 4 }}>Admin sign in</h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: 22 }}>Use your owner or staff account.</p>
          {err && <div className="errbox"><Icon name="alert" /> {err}</div>}
          <div className="field"><label>Username</label>
            <input className="input" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoFocus required />
          </div>
          <div className="field"><label>Password</label>
            <input className="input" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required />
          </div>
          <button className="btn pri" style={{ width: '100%', padding: 12 }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
