import { useEffect, useRef, useState } from 'react';
import { Drawer } from './Drawer';
import { api } from '../api';
import { useLanguage } from '../state/LanguageContext';

type PhraseLang = 'he' | 'en' | 'ja';
interface Suggestion { he: string }
interface Result { text: string; romaji: string | null }

// The phrasebook's own 3-way language selector (Hebrew/English/Japanese, for travel phrases) —
// unrelated to the app's UI language, which only ever offers Hebrew/English. Kept as-is on
// purpose: a Hebrew-speaking user planning a Japan trip still wants to translate to Japanese.
const LANG_LABEL: Record<PhraseLang, string> = { he: 'עברית', en: 'English', ja: '日本語' };
// Wait for a pause in typing before asking the translation service, so a sentence costs one request.
const TYPING_PAUSE_MS = 600;
const MAX_CHARS = 500;

export function TranslateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [from, setFrom] = useState<PhraseLang>('he');
  const [to, setTo] = useState<PhraseLang>('ja');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const latest = useRef(0);

  // The tap-to-fill suggestions only; what they translate to comes from the live translation below.
  useEffect(() => {
    if (open && suggestions.length === 0) {
      api('/translate/dictionary')
        .then((d) => setSuggestions((d.entries as { he: string; kind: string }[]).filter((e) => e.kind === 'phrase')))
        .catch(() => {});
    }
  }, [open, suggestions.length]);

  useEffect(() => {
    const text = input.trim();
    const mine = ++latest.current;
    setFailed(false);
    if (!text) { setResult(null); setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await api('/translate', { method: 'POST', json: { text, from, to } });
        if (mine === latest.current) { setResult(r); setLoading(false); }
      } catch {
        if (mine === latest.current) { setResult(null); setFailed(true); setLoading(false); }
      }
    }, TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [input, from, to]);

  function swap() {
    // The translation becomes the new text to translate back, the way every translator app behaves.
    const next = result?.text ?? '';
    setFrom(to); setTo(from); setInput(next);
  }
  function pickTo(l: PhraseLang) {
    if (l === from) { swap(); return; }
    setTo(l);
  }
  async function copyResult() {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.text); } catch { /* clipboard may be unavailable */ }
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  }

  const dir = (l: PhraseLang) => (l === 'he' ? 'rtl' : 'ltr');

  return (
    <Drawer open={open} onClose={onClose}>
      <div style={{ font: "600 20px/1.25 'Noto Sans Hebrew',sans-serif" }}>{t('translate.title')}</div>
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
        {(['he', 'en', 'ja'] as PhraseLang[]).map((l) => (
          <div key={l} onClick={() => pickTo(l)}
            style={{ flex: 1, textAlign: 'center', borderRadius: 999, padding: '8px 6px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${to === l ? 'var(--accent)' : 'var(--border)'}`, color: to === l ? 'var(--accent)' : 'var(--text-dim)' }}>
            {t('translate.toPrefix')}{LANG_LABEL[l]}
          </div>
        ))}
      </div>
      <textarea
        className="field"
        rows={3}
        maxLength={MAX_CHARS}
        style={{ marginTop: 16, direction: dir(from), resize: 'none' }}
        placeholder={t('translate.inputPlaceholder')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div style={{ marginTop: 12, minHeight: 60, background: 'var(--card-soft)', borderRadius: 14, padding: 16 }}>
        {result ? (
          <>
            <div style={{ font: "600 18px/1.4 'Noto Sans Hebrew',sans-serif", opacity: loading ? 0.5 : 1 }} dir={dir(to)}>{result.text}</div>
            {to === 'ja' && result.romaji && <div style={{ marginTop: 6, color: 'var(--text-dim)', fontSize: 12.5 }} dir="ltr">{result.romaji}</div>}
            <div onClick={copyResult} style={{ marginTop: 10, color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {copied ? t('translate.copied') : t('translate.copy')}
            </div>
          </>
        ) : (
          <div style={{ color: failed ? 'var(--danger)' : 'var(--text-dim)', fontSize: 12.5 }}>
            {failed ? t('translate.error') : loading ? t('translate.translating') : t('translate.prompt')}
          </div>
        )}
      </div>
      {suggestions.length > 0 && (
        <>
          <div className="section-label" style={{ padding: '20px 0 10px' }}>{t('translate.usefulPhrases')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((p) => (
              <div key={p.he} onClick={() => { setFrom('he'); if (to === 'he') setTo('ja'); setInput(p.he); }}
                style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '11px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>
                {p.he}
              </div>
            ))}
          </div>
        </>
      )}
    </Drawer>
  );
}
