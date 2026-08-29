import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { TranslateDrawer } from '../components/TranslateDrawer';

const QUICK: string[] = ['איך מגיעים מקיוטו לאוסקה?', 'מה לאכול הערב?', 'מה עושים אם יורד גשם?'];

export function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [trOpen, setTrOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function load() {
    const data = await api('/chat/messages');
    setMessages(data.messages);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setInput('');
    setSending(true);
    setMessages((m) => [...m, { id: 'tmp-' + Date.now(), role: 'user', content: text }]);
    try {
      const data = await api('/chat/messages', { method: 'POST', json: { content: text } });
      setMessages((m) => [...m, data.message]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 22px 16px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "400 18px 'Zen Old Mincho',serif", color: '#fff', flex: 'none' }}>
          案
        </div>
        <div>
          <div style={{ font: "600 15px 'Noto Sans Hebrew',sans-serif" }}>סוכן המסלול</div>
          <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 2 }}>יועץ טיולים לאורי ובת הזוג · יפן 2027</div>
        </div>
      </div>

      <div ref={listRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 22px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: '30px 0' }}>
            שאלו אותי על מסעדות, רכבות, מזג אוויר או שינויים במסלול.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            <div style={{
              maxWidth: '80%', borderRadius: 16, padding: '11px 14px', font: "400 14px/1.5 'Noto Sans Hebrew',sans-serif",
              background: m.role === 'user' ? 'var(--card-soft-2)' : 'var(--card)',
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && <div style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>הסוכן מקליד…</div>}
      </div>

      <div style={{ padding: '0 22px 10px' }}>
        <div style={{ display: 'flex', gap: 8, overflow: 'auto', paddingBottom: 6 }}>
          <div className="pill" style={{ cursor: 'pointer', border: '1px solid var(--border)', flex: 'none' }} onClick={() => setTrOpen(true)}>訳 תרגום</div>
          {QUICK.map((q) => (
            <div key={q} className="pill" style={{ cursor: 'pointer', border: '1px solid var(--border)', flex: 'none', whiteSpace: 'nowrap' }} onClick={() => send(q)}>{q}</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '0 22px 20px', alignItems: 'center' }}>
        <input className="field" style={{ borderRadius: 999 }} placeholder="שאל על המסלול…" value={input}
          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(input)} />
        <div onClick={() => send(input)} style={{
          width: 42, height: 42, borderRadius: '50%', background: 'var(--accent)', color: '#fff', flex: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18,
        }}>↑</div>
      </div>

      <TranslateDrawer open={trOpen} onClose={() => setTrOpen(false)} />
    </div>
  );
}
