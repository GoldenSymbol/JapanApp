import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api';
import { useLanguage } from '../state/LanguageContext';
import { useTripData, type BudgetSnapshot } from '../state/TripDataContext';
import { useAuth } from '../state/AuthContext';
import { EditIcon, CheckIcon, HistoryIcon } from '../components/Icons';

const CURRENCY_KEYS = ['ILS', 'JPY', 'USD', 'EUR'] as const;
const CURRENCY_SYMBOLS: Record<string, string> = { ILS: '₪', JPY: '¥', USD: '$', EUR: '€' };

function fmtCur(amount: number, code: string) {
  if (code === 'JPY') return Math.round(amount).toLocaleString('en-US');
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Whole numbers stay whole; converted amounts keep up to two decimals instead of the long tails
// toLocaleString would otherwise print.
function fmtAmount(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const TX_CURRENCY_KEY = 'budgetTxCurrency';
function readSavedTxCurrency(): string | null {
  try {
    const v = localStorage.getItem(TX_CURRENCY_KEY);
    return v && (CURRENCY_KEYS as readonly string[]).includes(v) ? v : null;
  } catch { return null; }
}

function Converter() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [from, setFrom] = useState('ILS');
  const [to, setTo] = useState('JPY');
  const [amount, setAmount] = useState('');

  useEffect(() => { api('/budget/fx-rates').then((d) => setRates(d.rates)); }, []);

  function pick(side: 'from' | 'to', code: string) {
    if (side === 'from') { if (code === to) setTo(from); setFrom(code); }
    else { if (code === from) setFrom(to); setTo(code); }
  }

  const amt = parseFloat(amount) || 0;
  const result = rates ? (amt / rates[from]) * rates[to] : 0;
  const rate = rates ? rates[to] / rates[from] : 0;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="section-label">{t('budget.converterTitle')}</div>
        <div className="pill" style={{ cursor: 'pointer', border: '1px solid var(--border)' }} onClick={() => setOpen((v) => !v)}>{open ? t('budget.close') : t('budget.open')}</div>
      </div>
      {open && (
        <div className="card" style={{ marginTop: 10, background: 'var(--card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input className="field" style={{ flex: 1, textAlign: 'right', direction: 'ltr' }} value={amount} placeholder="1000" onChange={(e) => setAmount(e.target.value)} />
            <div onClick={() => { setFrom(to); setTo(from); }} style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: 18, flex: 'none' }}>⇄</div>
          </div>
          <div className="section-label" style={{ padding: '14px 0 6px' }}>{t('budget.from')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CURRENCY_KEYS.map((c) => (
              <div key={c} onClick={() => pick('from', c)} className="pill" style={{ cursor: 'pointer', border: `1px solid ${from === c ? 'var(--accent)' : 'var(--border)'}`, color: from === c ? 'var(--accent)' : 'var(--text-dim)' }}>{t(`currency.${c}`)}</div>
            ))}
          </div>
          <div className="section-label" style={{ padding: '10px 0 6px' }}>{t('budget.to')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CURRENCY_KEYS.map((c) => (
              <div key={c} onClick={() => pick('to', c)} className="pill" style={{ cursor: 'pointer', border: `1px solid ${to === c ? 'var(--accent)' : 'var(--border)'}`, color: to === c ? 'var(--accent)' : 'var(--text-dim)' }}>{t(`currency.${c}`)}</div>
            ))}
          </div>
          <div style={{ marginTop: 16, direction: 'ltr', textAlign: 'left' }}>
            <div style={{ font: "600 27px/1.2 'Noto Sans Hebrew',sans-serif" }}>{CURRENCY_SYMBOLS[to]}{fmtCur(result, to)}</div>
            <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 6 }}>
              1 {CURRENCY_SYMBOLS[from]} = {fmtCur(rate, to)} {CURRENCY_SYMBOLS[to]} · {t('budget.rateNote')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
            {[100, 500, 1000, 5000].map((v) => (
              <div key={v} className="pill" style={{ cursor: 'pointer', border: '1px solid var(--border)' }} onClick={() => setAmount(String(v))}>{v}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PIE_COLORS = ['#D9564B', '#7FB069', '#6FA8DC', '#D9A441', '#C77DBB', '#4E8098', '#B24C63', '#8C6E4A', '#5C8A5C', '#A5794D'];
const REMAINING_COLOR = '#3A3D42';

// A plain SVG pie chart — no charting library needed for a handful of slices.
function PieChart({ slices, size = 200 }: { slices: { label: string; value: number; color: string }[]; size?: number }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  const radius = size / 2;
  if (total <= 0) return null;
  const nonZero = slices.filter((s) => s.value > 0);
  if (nonZero.length === 1) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={radius} cy={radius} r={radius} fill={nonZero[0].color} />
      </svg>
    );
  }
  let cumulative = 0;
  const paths = slices.filter((s) => s.value > 0).map((s, i) => {
    const startAngle = (cumulative / total) * 2 * Math.PI;
    cumulative += s.value;
    const endAngle = (cumulative / total) * 2 * Math.PI;
    const x1 = radius + radius * Math.sin(startAngle);
    const y1 = radius - radius * Math.cos(startAngle);
    const x2 = radius + radius * Math.sin(endAngle);
    const y2 = radius - radius * Math.cos(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return { key: i, d: `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`, color: s.color };
  });
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {paths.map((p) => <path key={p.key} d={p.d} fill={p.color} />)}
    </svg>
  );
}

function BudgetPieView({ data }: { data: any }) {
  const { t } = useLanguage();
  const sym = CURRENCY_SYMBOLS[data.currency || 'ILS'];
  const remaining = Math.max(0, data.total - data.paid);
  const slices = [
    ...data.categories.map((c: any, i: number) => ({ label: c.name, value: c.spent, color: PIE_COLORS[i % PIE_COLORS.length] })),
    ...(remaining > 0 ? [{ label: t('budget.remaining'), value: remaining, color: REMAINING_COLOR }] : []),
  ];
  const sum = slices.reduce((s, x) => s + x.value, 0);

  if (sum <= 0) {
    return (
      <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
        {t('budget.noExpenses')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '10px 0 4px' }}>
      <PieChart slices={slices} />
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flex: 'none' }} />
            <div style={{ flex: 1, font: "500 13.5px 'Noto Sans Hebrew',sans-serif" }}>{s.label}</div>
            <div style={{ font: "600 13.5px 'Noto Sans Hebrew',sans-serif" }}>{sym}{fmtAmount(s.value)}</div>
            <div style={{ font: "400 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', width: 38, textAlign: 'left' }}>
              {Math.round((s.value / sum) * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// How many of the newest entries show before "show more".
const HISTORY_PREVIEW_COUNT = 3;

interface HistoryEntry {
  id: string; categoryName: string; amount: number;
  originalAmount: number | null; originalCurrency: string | null;
  userId: string | null; createdAtMs: number;
}

// The newest-first list of every add/subtract. Fetched each time it's opened rather than cached, so
// it can't show a stale list after expenses were entered since the last visit.
function HistoryList({ basePath, sym, cur }: { basePath: string; sym: string; cur: string }) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { tripMeta } = useTripData();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api(`${basePath}/transactions`)
      .then((d) => { if (!cancelled) setEntries(d.transactions); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [basePath]);

  const dim = { font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 3 } as const;
  if (failed) return <div style={{ ...dim, padding: '30px 0', textAlign: 'center' }}>{t('budget.historyError')}</div>;
  if (!entries) return <div style={{ ...dim, padding: '30px 0', textAlign: 'center' }}>{t('budget.historyLoading')}</div>;
  if (entries.length === 0) return <div style={{ ...dim, padding: '30px 0', textAlign: 'center', fontSize: 13 }}>{t('budget.historyEmpty')}</div>;

  return (
    <div>
      <div className="section-label" style={{ padding: '20px 0 6px' }}>{t('budget.history')}</div>
      {(expanded ? entries : entries.slice(0, HISTORY_PREVIEW_COUNT)).map((e) => {
        // Every entry in a personal budget is the owner's, including ones from before authors were
        // recorded; in the shared budget an entry with no recorded author stays unattributed.
        const authorId = e.userId ?? (basePath === '/budget' ? null : user?.id ?? null);
        const member = authorId ? tripMeta?.members.find((m) => m.id === authorId) : undefined;
        const when = new Date(e.createdAtMs).toLocaleString(lang === 'en' ? 'en-GB' : 'he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
        const foreign = e.originalCurrency && e.originalCurrency !== cur && e.originalAmount !== null;
        return (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '13px 0', borderTop: '1px solid var(--border-soft)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: "600 14.5px 'Noto Sans Hebrew',sans-serif" }}>{e.categoryName}</div>
              <div style={{ ...dim, display: 'flex', alignItems: 'center', gap: 6 }}>
                {member && (
                  <span style={{ width: 16, height: 16, flex: 'none', borderRadius: '50%', background: member.avatarColor, color: '#14161A',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: "600 9px 'Noto Sans Hebrew',sans-serif" }}>
                    {member.name.charAt(0)}
                  </span>
                )}
                <span>{[member?.name, when].filter(Boolean).join(' · ')}</span>
              </div>
            </div>
            <div style={{ flex: 'none', textAlign: 'end' }}>
              <div style={{ font: "600 14.5px 'Noto Sans Hebrew',sans-serif", color: e.amount < 0 ? 'var(--accent)' : 'var(--text)' }}>
                <span dir="ltr">{e.amount < 0 ? '−' : '+'}{sym}{fmtAmount(Math.abs(e.amount))}</span>
              </div>
              {foreign && <div dir="ltr" style={dim}>{CURRENCY_SYMBOLS[e.originalCurrency!]}{fmtAmount(Math.abs(e.originalAmount!))}</div>}
            </div>
          </div>
        );
      })}
      {entries.length > HISTORY_PREVIEW_COUNT && (
        <div onClick={() => setExpanded((v) => !v)}
          style={{ padding: '14px 0 4px', textAlign: 'center', font: "600 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer', borderTop: '1px solid var(--border-soft)' }}>
          {expanded ? t('budget.historyLess') : t('budget.historyMore', { count: entries.length - HISTORY_PREVIEW_COUNT })}
        </div>
      )}
    </div>
  );
}

// Shared UI for both the group budget (basePath="/budget") and each member's own private
// personal budget (basePath="/budget/personal") — same shape of data, same interactions. Reads
// its snapshot from TripDataContext (prefetched once alongside the rest of the trip's data)
// instead of fetching its own on mount, and calls the matching refresh*() there after any
// mutation instead of refetching locally — see that context for why.
function BudgetSection({ basePath, data, refreshData, setData, title, subtitle, newCategoryLabel, allowChart }: {
  basePath: string; data: BudgetSnapshot | null; refreshData: () => Promise<void>; setData: (s: BudgetSnapshot) => void;
  title: string; subtitle?: string; newCategoryLabel: string; allowChart?: boolean;
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [addVals, setAddVals] = useState<Record<string, string>>({});
  // Mirrors addVals so applyTx can read and clear an amount synchronously: two taps landing before
  // React re-renders would otherwise both see the same filled input and record it twice.
  const addValsRef = useRef<Record<string, string>>({});
  function setAdd(id: string, value: string) {
    addValsRef.current = { ...addValsRef.current, [id]: value };
    setAddVals(addValsRef.current);
  }
  const [view, setView] = useState<'list' | 'chart'>('chart');
  const [totalDraft, setTotalDraft] = useState('');
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});

  async function setTotal(v: number) { await api(basePath, { method: 'PATCH', json: { total: v } }); await refreshData(); }
  async function renameCat(id: string, name: string) { await api(`${basePath}/categories/${id}`, { method: 'PATCH', json: { name } }); await refreshData(); }
  async function deleteCat(id: string) { await api(`${basePath}/categories/${id}`, { method: 'DELETE' }); await refreshData(); }
  async function addCategory() { await api(`${basePath}/categories`, { method: 'POST', json: { name: newCategoryLabel, planned: 0 } }); await refreshData(); }
  // The POST answers with the full updated snapshot, so there's no follow-up GET. The input clears
  // and the totals move immediately (the server's numbers replace the estimate when they arrive);
  // clearing right away is also what stops a slow response from inviting a second tap that would
  // record the same amount twice.
  const txSeq = useRef(0);
  const cur = data?.currency || 'ILS';
  const sym = CURRENCY_SYMBOLS[cur];
  // Each category row keeps its own currency choice, so changing one never moves the others. A row
  // nobody has touched starts from the last currency used in a previous visit (read once, so
  // picking one here doesn't also change the rows below it), else the budget's own currency.
  const [startCurrency] = useState<string | null>(readSavedTxCurrency);
  const [rowCurrencies, setRowCurrencies] = useState<Record<string, string>>({});
  const txCurrencyFor = (id: string) => rowCurrencies[id] ?? startCurrency ?? cur;
  // Which category's currency dropdown is open.
  const [currencyMenuId, setCurrencyMenuId] = useState<string | null>(null);
  const [fx, setFx] = useState<{ rates: Record<string, number>; live: boolean } | null>(null);
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rates are only needed for the live preview and the instant estimate; the server does the real
  // conversion. Fetched when editing starts, so the common no-edit view makes no extra request.
  useEffect(() => {
    if (!editing || fx) return;
    api('/budget/fx-rates').then((d) => setFx({ rates: d.rates, live: d.live })).catch(() => {});
  }, [editing, fx]);

  function pickTxCurrency(id: string, c: string) {
    setRowCurrencies((r) => ({ ...r, [id]: c }));
    try { localStorage.setItem(TX_CURRENCY_KEY, c); } catch { /* remembering the choice is a convenience only */ }
    setCurrencyMenuId(null);
  }
  // Same arithmetic and rounding as the server; null while rates haven't loaded.
  function toBudgetCurrency(amount: number, from: string): number | null {
    if (from === cur) return amount;
    if (!fx) return null;
    const converted = amount * ((fx.rates[cur] ?? 1) / (fx.rates[from] ?? 1));
    return cur === 'JPY' ? Math.round(converted) : Math.round(converted * 100) / 100;
  }
  async function applyTx(id: string, direction: 'add' | 'subtract') {
    const amount = parseFloat(addValsRef.current[id] || '0');
    if (!amount || !data) return;
    const txCurrency = txCurrencyFor(id);
    const converted = toBudgetCurrency(amount, txCurrency);
    setAdd(id, '');
    // With no rate to estimate from yet, skip the instant update; the server's answer still lands.
    if (converted !== null) {
      const signed = direction === 'subtract' ? -converted : converted;
      const categories = data.categories.map((c) => {
        if (c.id !== id) return c;
        const spent = c.spent + signed;
        return { ...c, spent, percent: c.planned > 0 ? Math.min(999, Math.round((spent / c.planned) * 100)) : 0 };
      });
      setData({ ...data, paid: data.paid + signed, categories });
    }
    const seq = ++txSeq.current;
    try {
      const { conversion, ...snapshot } = await api(`${basePath}/categories/${id}/transactions`, {
        method: 'POST', json: { amount, direction, currency: txCurrency },
      });
      if (seq === txSeq.current) setData(snapshot);
      if (conversion) {
        const from = CURRENCY_SYMBOLS[conversion.originalCurrency];
        const text = `${from}${fmtAmount(Math.abs(conversion.originalAmount))} ≈ ${sym}${fmtAmount(Math.abs(conversion.amount))}`
          + (conversion.rateLive ? '' : ` (${t('budget.approxRate')})`);
        setNotice({ id, text });
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNotice(null), 5000);
      }
    } catch {
      await refreshData();
      setAdd(id, String(amount));
    }
  }

  if (!data) return null;
  const paidPct = data.total > 0 ? Math.min(100, Math.round((data.paid / data.total) * 100)) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 0 14px' }}>
        <div>
          <div style={{ font: "600 20px/1.2 'Noto Sans Hebrew',sans-serif" }}>{title}</div>
          {subtitle && <div style={{ font: "400 12.5px/1.4 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 5 }}>{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="icon-btn" onClick={() => { setShowHistory((v) => !v); setEditing(false); }} aria-label={t('budget.history')}
            style={{ border: `1px solid ${showHistory ? 'var(--accent)' : 'var(--border)'}`, color: showHistory ? 'var(--accent)' : 'var(--text-dim)' }}>
            <HistoryIcon />
          </div>
          <div className="icon-btn" onClick={() => { setEditing((v) => !v); setShowHistory(false); }} aria-label={editing ? t('common.done') : t('common.edit')}
            style={{ border: `1px solid ${editing ? 'var(--accent)' : 'var(--border)'}`, color: editing ? 'var(--accent)' : 'var(--text-dim)' }}>
            {editing ? <CheckIcon /> : <EditIcon />}
          </div>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--card)' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div className="section-label" style={{ paddingBottom: 6 }}>{t('budget.totalLabel', { cur: sym })}</div>
              <input className="field" style={{ fontWeight: 600 }} type="number" value={totalDraft} placeholder={String(data.total)}
                onChange={(e) => setTotalDraft(e.target.value)}
                onBlur={(e) => { if (e.target.value.trim() !== '') setTotal(Number(e.target.value)); setTotalDraft(''); }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 2 }}>
              <div style={{ font: "500 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)' }}>{t('budget.paidSoFar')}</div>
              <div style={{ font: "600 17px 'Noto Sans Hebrew',sans-serif" }}>{sym}{fmtAmount(data.paid)}</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ font: "600 15px 'Noto Sans Hebrew',sans-serif" }}>{t('budget.paidSoFarShort')}</div>
              <div style={{ font: "600 22px 'Noto Sans Hebrew',sans-serif" }}>{sym}{fmtAmount(data.paid)}</div>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--card-soft-2)', marginTop: 12, overflow: 'hidden' }}>
              <div style={{ width: `${paidPct}%`, height: '100%', background: 'var(--accent)' }} />
            </div>
            <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 8 }}>{t('budget.paidPctOfBudget', { pct: paidPct })}</div>
          </>
        )}
      </div>

      {showHistory ? (
        <HistoryList basePath={basePath} sym={sym} cur={cur} />
      ) : (
      <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 10px' }}>
        <div className="section-label" style={{ padding: 0 }}>{t('budget.byCategory')}</div>
        {allowChart && !editing && data.categories.length > 0 && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--card-soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
            {(['list', 'chart'] as const).map((v) => (
              <div key={v} onClick={() => setView(v)}
                style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? '#fff' : 'var(--text-dim)' }}>
                {v === 'list' ? t('budget.viewList') : t('budget.viewChart')}
              </div>
            ))}
          </div>
        )}
      </div>
      {allowChart && !editing && view === 'chart' ? (
        <BudgetPieView data={data} />
      ) : (
      <AnimatePresence initial={false}>
      {data.categories.map((c: any) => {
        const pct = data.total > 0 ? Math.min(100, Math.round((c.spent / data.total) * 100)) : 0;
        const rowCur = txCurrencyFor(c.id);
        return (
          <motion.div key={c.id} layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            style={{ padding: '14px 0', borderTop: '1px solid var(--border-soft)' }}>
            {editing ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="field" style={{ flex: 1 }} value={nameDrafts[c.id] || ''} placeholder={c.name}
                  onChange={(e) => setNameDrafts((v) => ({ ...v, [c.id]: e.target.value }))}
                  onBlur={(e) => { if (e.target.value.trim() !== '') renameCat(c.id, e.target.value); setNameDrafts((v) => ({ ...v, [c.id]: '' })); }} />
                <div style={{ font: "600 14px 'Noto Sans Hebrew',sans-serif", flex: 'none' }}>{sym}{fmtAmount(c.spent)}</div>
                <div onClick={() => deleteCat(c.id)} style={{ font: "600 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', cursor: 'pointer', flex: 'none' }}>{t('common.delete')}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ font: "600 14.5px 'Noto Sans Hebrew',sans-serif" }}>{c.name}</div>
                <div style={{ font: "600 14.5px 'Noto Sans Hebrew',sans-serif" }}>{sym}{fmtAmount(c.spent)}</div>
              </div>
            )}
            {!editing && (
              <>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--card-soft-2)', marginTop: 9, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--text-dim-2)' }} />
                </div>
                {c.note && <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7 }}>{c.note}</div>}
              </>
            )}
            {editing && (
              <div style={{ marginTop: 10, display: 'flex', gap: 7, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 'none' }}>
                  <div onClick={() => setCurrencyMenuId(currencyMenuId === c.id ? null : c.id)} aria-label={t('budget.pickCurrency')}
                    style={{ cursor: 'pointer', padding: '9px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600,
                      border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                    {CURRENCY_SYMBOLS[rowCur]}
                  </div>
                  {currencyMenuId === c.id && (
                    <>
                      <div onClick={() => setCurrencyMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', insetInlineStart: 0, zIndex: 31, minWidth: 150, maxHeight: 220, overflowY: 'auto',
                        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
                        {CURRENCY_KEYS.map((k) => (
                          <div key={k} onClick={() => pickTxCurrency(c.id, k)}
                            style={{ padding: '10px 12px', borderRadius: 10, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
                              fontWeight: rowCur === k ? 600 : 500, color: rowCur === k ? 'var(--accent)' : 'var(--text)',
                              background: rowCur === k ? 'var(--card-soft)' : 'transparent' }}>
                            {t(`currency.${k}`)}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <input className="field" style={{ flex: 1, minWidth: 0, borderStyle: 'dashed' }} placeholder={t('budget.addExpensePlaceholder')} value={addVals[c.id] || ''}
                  onChange={(e) => setAdd(c.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyTx(c.id, 'add')} />
                <div className="btn btn-accent" onClick={() => applyTx(c.id, 'add')}>{t('budget.addTx')}</div>
                <div className="btn btn-outline" onClick={() => applyTx(c.id, 'subtract')}>{t('budget.subtractTx')}</div>
              </div>
            )}
            {editing && (() => {
              // Only the conversion is shown: live while typing a foreign amount, then as a short
              // confirmation after it's added. Same-currency entries show nothing here.
              const typed = parseFloat(addVals[c.id] || '');
              const converted = typed && rowCur !== cur ? toBudgetCurrency(typed, rowCur) : null;
              const text = typed
                ? (converted !== null ? `${CURRENCY_SYMBOLS[rowCur]}${fmtAmount(typed)} ≈ ${sym}${fmtAmount(converted)}` : null)
                : (notice && notice.id === c.id ? notice.text : null);
              return text && (
                <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 6 }}>{text}</div>
              );
            })()}
          </motion.div>
        );
      })}
      </AnimatePresence>
      )}
      {editing && (
        <div className="btn btn-ghost" style={{ marginTop: 14, textAlign: 'center', padding: 16, borderStyle: 'dashed', borderRadius: 20 }} onClick={addCategory}>
          {t('budget.addCategory')}
        </div>
      )}
      </>
      )}
    </div>
  );
}

export function Budget() {
  const { t } = useLanguage();
  const { budget, refreshBudget, setBudgetSnapshot, personalBudget, refreshPersonalBudget, setPersonalBudgetSnapshot } = useTripData();
  const [mode, setMode] = useState<'general' | 'personal'>('general');

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 22px calc(102px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: '12px 0 20px' }}>
        <div style={{ font: "600 30px/1.15 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.5px' }}>{t('budget.title')}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, margin: '0 0 20px', background: 'var(--card-soft)', border: '1px solid var(--border)', borderRadius: 14, padding: 4 }}>
        {(['general', 'personal'] as const).map((m) => (
          <div key={m} onClick={() => setMode(m)}
            style={{ flex: 1, textAlign: 'center', borderRadius: 11, padding: '9px 8px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-dim)' }}>
            {m === 'general' ? t('budget.tabGeneral') : t('budget.tabPersonal')}
          </div>
        ))}
      </div>

      {mode === 'general' ? (
        <BudgetSection key="general" basePath="/budget" data={budget} refreshData={refreshBudget} setData={setBudgetSnapshot} title={t('budget.generalTitle')} subtitle={t('budget.generalSubtitle')} newCategoryLabel={t('budget.newCategoryGeneral')} allowChart />
      ) : (
        <BudgetSection key="personal" basePath="/budget/personal" data={personalBudget} refreshData={refreshPersonalBudget} setData={setPersonalBudgetSnapshot} title={t('budget.personalTitle')} newCategoryLabel={t('budget.newCategoryPersonal')} allowChart />
      )}

      <Converter />
    </div>
  );
}
