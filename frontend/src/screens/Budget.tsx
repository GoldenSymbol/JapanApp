import { useEffect, useState } from 'react';
import { api } from '../api';

const CURRENCIES: Record<string, { label: string; symbol: string }> = {
  ILS: { label: '₪ שקל', symbol: '₪' },
  JPY: { label: '¥ יין', symbol: '¥' },
  USD: { label: '$ דולר', symbol: '$' },
  EUR: { label: '€ אירו', symbol: '€' },
};

function fmtCur(amount: number, code: string) {
  if (code === 'JPY') return Math.round(amount).toLocaleString('en-US');
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Converter() {
  const [open, setOpen] = useState(true);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [from, setFrom] = useState('ILS');
  const [to, setTo] = useState('JPY');
  const [amount, setAmount] = useState('1000');

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
        <div className="section-label">מחשבון המרה</div>
        <div className="pill" style={{ cursor: 'pointer', border: '1px solid var(--border)' }} onClick={() => setOpen((v) => !v)}>{open ? 'סגור' : 'פתח'}</div>
      </div>
      {open && (
        <div className="card" style={{ marginTop: 10, background: 'var(--card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input className="field" style={{ flex: 1, textAlign: 'right', direction: 'ltr' }} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div onClick={() => { setFrom(to); setTo(from); }} style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: 18, flex: 'none' }}>⇄</div>
          </div>
          <div className="section-label" style={{ padding: '14px 0 6px' }}>מ־</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.keys(CURRENCIES).map((c) => (
              <div key={c} onClick={() => pick('from', c)} className="pill" style={{ cursor: 'pointer', border: `1px solid ${from === c ? 'var(--accent)' : 'var(--border)'}`, color: from === c ? 'var(--accent)' : 'var(--text-dim)' }}>{CURRENCIES[c].label}</div>
            ))}
          </div>
          <div className="section-label" style={{ padding: '10px 0 6px' }}>ל־</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.keys(CURRENCIES).map((c) => (
              <div key={c} onClick={() => pick('to', c)} className="pill" style={{ cursor: 'pointer', border: `1px solid ${to === c ? 'var(--accent)' : 'var(--border)'}`, color: to === c ? 'var(--accent)' : 'var(--text-dim)' }}>{CURRENCIES[c].label}</div>
            ))}
          </div>
          <div style={{ marginTop: 16, direction: 'ltr', textAlign: 'left' }}>
            <div style={{ font: "600 27px/1.2 'Noto Sans Hebrew',sans-serif" }}>{CURRENCIES[to].symbol}{fmtCur(result, to)}</div>
            <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 6 }}>
              1 {CURRENCIES[from].symbol} = {fmtCur(rate, to)} {CURRENCIES[to].symbol} · שערים משוערים, לעדכן לפני הטיסה
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

export function Budget() {
  const [data, setData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [addVals, setAddVals] = useState<Record<string, string>>({});

  async function load() { setData(await api('/budget')); }
  useEffect(() => { load(); }, []);

  async function setTotal(v: number) { await api('/budget', { method: 'PATCH', json: { total: v } }); await load(); }
  async function renameCat(id: string, name: string) { await api(`/budget/categories/${id}`, { method: 'PATCH', json: { name } }); await load(); }
  async function deleteCat(id: string) { await api(`/budget/categories/${id}`, { method: 'DELETE' }); await load(); }
  async function addCategory() { await api('/budget/categories', { method: 'POST', json: { name: 'קטגוריה חדשה', planned: 0 } }); await load(); }
  async function applyTx(id: string, direction: 'add' | 'subtract') {
    const amount = parseFloat(addVals[id] || '0');
    if (!amount) return;
    await api(`/budget/categories/${id}/transactions`, { method: 'POST', json: { amount, direction } });
    setAddVals((v) => ({ ...v, [id]: '' }));
    await load();
  }

  if (!data) return null;
  const perDay = Math.round(data.total / 32);
  const paidPct = data.total > 0 ? Math.min(100, Math.round((data.paid / data.total) * 100)) : 0;

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 22px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '12px 0 20px' }}>
        <div>
          <div style={{ font: "600 30px/1.15 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.5px' }}>תקציב</div>
          <div style={{ font: "400 12.5px/1.4 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7 }}>
            מתוכנן ₪{data.total.toLocaleString('en-US')} · 32 ימים · ₪{perDay.toLocaleString('en-US')} ליום
          </div>
        </div>
        <div className="pill" onClick={() => setEditing((v) => !v)} style={{ cursor: 'pointer', border: `1px solid ${editing ? 'var(--accent)' : 'var(--border)'}`, color: editing ? 'var(--accent)' : 'var(--text)', padding: '8px 14px' }}>
          {editing ? 'סיום' : 'עריכה'}
        </div>
      </div>

      <div className="card" style={{ background: 'var(--card)' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div className="section-label" style={{ paddingBottom: 6 }}>תקציב כולל (₪)</div>
              <input className="field" style={{ fontWeight: 600 }} type="number" defaultValue={data.total} onBlur={(e) => setTotal(Number(e.target.value))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 2 }}>
              <div style={{ font: "500 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)' }}>שולם עד כה (סכום כל הקטגוריות)</div>
              <div style={{ font: "600 17px 'Noto Sans Hebrew',sans-serif" }}>₪{data.paid.toLocaleString('en-US')}</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ font: "600 15px 'Noto Sans Hebrew',sans-serif" }}>שולם עד כה</div>
              <div style={{ font: "600 22px 'Noto Sans Hebrew',sans-serif" }}>₪{data.paid.toLocaleString('en-US')}</div>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--card-soft-2)', marginTop: 12, overflow: 'hidden' }}>
              <div style={{ width: `${paidPct}%`, height: '100%', background: 'var(--accent)' }} />
            </div>
            <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 8 }}>{paidPct}% מהתקציב · סכום כל הקטגוריות</div>
          </>
        )}
      </div>

      <Converter />

      <div className="section-label" style={{ padding: '26px 0 10px' }}>לפי קטגוריה</div>
      {data.categories.map((c: any) => {
        const pct = data.total > 0 ? Math.min(100, Math.round((c.spent / data.total) * 100)) : 0;
        return (
          <div key={c.id} style={{ padding: '14px 0', borderTop: '1px solid var(--border-soft)' }}>
            {editing ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="field" style={{ flex: 1 }} defaultValue={c.name} onBlur={(e) => renameCat(c.id, e.target.value)} />
                <div style={{ font: "600 14px 'Noto Sans Hebrew',sans-serif", flex: 'none' }}>₪{c.spent.toLocaleString('en-US')}</div>
                <div onClick={() => deleteCat(c.id)} style={{ font: "600 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', cursor: 'pointer', flex: 'none' }}>מחק</div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ font: "600 14.5px 'Noto Sans Hebrew',sans-serif" }}>{c.name}</div>
                <div style={{ font: "600 14.5px 'Noto Sans Hebrew',sans-serif" }}>₪{c.spent.toLocaleString('en-US')}</div>
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
                <input className="field" style={{ flex: 1, borderStyle: 'dashed' }} placeholder="הוסף הוצאה (₪)" value={addVals[c.id] || ''}
                  onChange={(e) => setAddVals((v) => ({ ...v, [c.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && applyTx(c.id, 'add')} />
                <div className="btn btn-accent" onClick={() => applyTx(c.id, 'add')}>הוסף</div>
                <div className="btn btn-outline" onClick={() => applyTx(c.id, 'subtract')}>הורד</div>
              </div>
            )}
            {editing && (
              <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 6 }}>
                {addVals[c.id] ? `${c.spent.toLocaleString('en-US')} + ${addVals[c.id]} = ${(c.spent + (parseFloat(addVals[c.id]) || 0)).toLocaleString('en-US')} · או ${Math.max(0, c.spent - (parseFloat(addVals[c.id]) || 0)).toLocaleString('en-US')} אם מורידים` : `סה״כ בקטגוריה: ₪${c.spent.toLocaleString('en-US')}`}
              </div>
            )}
          </div>
        );
      })}
      {editing && (
        <div className="btn btn-ghost" style={{ marginTop: 14, textAlign: 'center', padding: 16, borderStyle: 'dashed', borderRadius: 20 }} onClick={addCategory}>
          + הוסף קטגוריה
        </div>
      )}
    </div>
  );
}
