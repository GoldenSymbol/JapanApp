import { useEffect, useMemo, useState } from 'react';
import { Drawer } from './Drawer';
import { api } from '../api';

type Lang = 'he' | 'en' | 'ja';
interface Entry { he: string; en: string; ja: string; romaji: string; kind: string }

const LANG_LABEL: Record<Lang, string> = { he: 'עברית', en: 'English', ja: '日本語' };

export function TranslateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [from, setFrom] = useState<Lang>('he');
  const [to, setTo] = useState<Lang>('ja');
  const [input, setInput] = useState('');

  useEffect(() => {
    if (open && entries.length === 0) {
      api('/translate/dictionary').then((d) => setEntries(d.entries));
    }
  }, [open, entries.length]);

  const match = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return null;
    return entries.find((e) => e[from].trim().toLowerCase() === q) || null;
  }, [entries, input, from]);

  const phrases = entries.filter((e) => e.kind === 'phrase');

  function swap() {
    setFrom(to); setTo(from); setInput('');
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div style={{ font: "600 20px/1.25 'Noto Sans Hebrew',sans-serif" }}>訳 תרגום</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
        <div style={{ flex: 1, textAlign: 'center', background: 'var(--card-soft)', borderRadius: 12, padding: '10px 0', fontWeight: 600 }}>
          {LANG_LABEL[from]}
        </div>
        <div onClick={swap} style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: 18, flex: 'none' }} dir="ltr">⇄</div>
        <div style={{ flex: 1, textAlign: 'center', background: 'var(--card-soft)', borderRadius: 12, padding: '10px 0', fontWeight: 600 }}>
          {LANG_LABEL[to]}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {(['he', 'en', 'ja'] as Lang[]).map((l) => (
          <div key={l} onClick={() => setTo(l === from ? to : l)}
            style={{ flex: 1, textAlign: 'center', borderRadius: 999, padding: '8px 6px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${to === l ? 'var(--accent)' : 'var(--border)'}`, color: to === l ? 'var(--accent)' : 'var(--text-dim)' }}>
            ל{LANG_LABEL[l]}
          </div>
        ))}
      </div>
      <input
        className="field"
        style={{ marginTop: 16, direction: from === 'en' ? 'ltr' : 'rtl' }}
        placeholder="הקלד/י מילה..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div style={{ marginTop: 12, minHeight: 60, background: 'var(--card-soft)', borderRadius: 14, padding: 16 }}>
        {match ? (
          <>
            <div style={{ font: "600 18px/1.3 'Noto Sans Hebrew',sans-serif" }} dir={to === 'en' ? 'ltr' : undefined}>{match[to]}</div>
            {to === 'ja' && <div style={{ marginTop: 6, color: 'var(--text-dim)', fontSize: 12.5 }} dir="ltr">{match.romaji}</div>}
          </>
        ) : (
          <div style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>
            {input.trim() ? 'לא נמצא במילון — נסו לשאול את הסוכן בצ׳אט.' : 'הקלידו מילה או בחרו ביטוי שימושי למטה.'}
          </div>
        )}
      </div>
      <div className="section-label" style={{ padding: '20px 0 10px' }}>ביטויים שימושיים</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {phrases.map((p) => (
          <div key={p.he} onClick={() => { setFrom('he'); setInput(p.he); }}
            style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '11px 14px', cursor: 'pointer' }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.he}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }} dir="ltr">{p.en}</div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
