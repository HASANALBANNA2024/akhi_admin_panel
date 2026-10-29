'use client';
/**
 * CHAT & MESSAGES — Facebook/Instagram inbox: threads, conversation, reply, delete.
 * APIs: GET /admin/chat/threads?unread_only=&page=&page_size= · GET /admin/chat/threads/{id}/messages (marks read)
 *       POST /admin/chat/threads/{id}/reply {text} · DELETE /admin/chat/threads/{id} · GET /admin/chat/unread-count
 */
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { Badge, Empty, ErrorBox, Loading, Pager } from '@/components/ui';
import { useConfirm, useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { dt, timeAgo } from '@/lib/format';

export default function ChatSection() {
  const toast = useToast();
  const confirm = useConfirm();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const threads = useAsync(() => api('/admin/chat/threads', { query: { unread_only: unreadOnly, page, page_size: 30 } }), [unreadOnly, page]);
  const msgs = useAsync(() => (sel ? api(`/admin/chat/threads/${sel.id}/messages`) : Promise.resolve([])), [sel?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.data]);
  // light polling so new messages appear
  useEffect(() => {
    const t = setInterval(() => { threads.reload(); if (sel) msgs.reload(); }, 20000);
    return () => clearInterval(t);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !sel) return;
    setSending(true);
    try { await api(`/admin/chat/threads/${sel.id}/reply`, { method: 'POST', body: { text: t } }); setText(''); msgs.reload(); threads.reload(); }
    catch (err) { toast.error(err.message); } finally { setSending(false); }
  }
  async function remove() {
    if (!(await confirm({ title: 'Delete conversation?', text: `All messages with ${sel.name} will be deleted here.`, confirmText: 'Delete', danger: true }))) return;
    try { await api(`/admin/chat/threads/${sel.id}`, { method: 'DELETE' }); toast.ok('Conversation deleted'); setSel(null); threads.reload(); }
    catch (e) { toast.error(e.message); }
  }
  const list = threads.data || [];

  return (
    <div>
      <ErrorBox error={threads.error} onRetry={threads.reload} />
      <div className={`card chat ${sel ? 'open' : ''}`}>
        <div className="threads">
          <div style={{ padding: 12, display: 'flex', gap: 8, borderBottom: '1px solid var(--line)' }}>
            <button className={`tab ${!unreadOnly ? 'on' : ''}`} onClick={() => { setUnreadOnly(false); setPage(1); }}>All</button>
            <button className={`tab ${unreadOnly ? 'on' : ''}`} onClick={() => { setUnreadOnly(true); setPage(1); }}>Unread</button>
          </div>
          {threads.loading && !threads.data ? <Loading /> : list.length === 0 ? <Empty icon="chat" text="No conversations" /> : list.map((t) => (
            <div key={t.id} className={`th ${sel?.id === t.id ? 'on' : ''}`} onClick={() => setSel(t)}>
              <div className="avatar">{(t.name || '?').slice(0, 1).toUpperCase()}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="flex sp"><b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</b><span className="muted sm">{timeAgo(t.last_message_at)}</span></div>
                <div className="flex sp center gap">
                  <span className="muted sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.last_text || '—'}</span>
                  {t.unread > 0 && <span className="badge pink">{t.unread}</span>}
                </div>
                {t.is_comment && <Badge tone="blue">Comment</Badge>}
              </div>
            </div>
          ))}
          {(list.length > 0 || page > 1) && <Pager page={page} pageSize={30} count={list.length} onPage={setPage} />}
        </div>

        <div className="conv">
          {!sel ? <Empty icon="chat" text="Select a conversation" /> : (
            <>
              <div className="flex center gap" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <button className="btn sm back" onClick={() => setSel(null)}><Icon name="back" size={14} /></button>
                <div className="avatar">{(sel.name || '?').slice(0, 1).toUpperCase()}</div>
                <b style={{ flex: 1 }}>{sel.name}</b>
                {sel.is_comment && <Badge tone="blue">Comment thread</Badge>}
                <button className="btn sm danger" onClick={remove}><Icon name="trash" size={14} /></button>
              </div>
              <div className="msgs">
                {msgs.loading && !msgs.data ? <Loading /> : (msgs.data || []).map((m) => (
                  <div key={m.id} className={`bubble ${m.direction === 'out' ? 'out' : ''}`}>
                    {m.kind === 'comment' && <><Badge tone="blue">comment</Badge>{' '}</>}{m.text}
                    <small>{dt(m.created_at)}</small>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form className="composer" onSubmit={send}>
                <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" maxLength={1900} />
                <button className="btn pri" disabled={sending || !text.trim()}><Icon name="send" size={15} /> Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
