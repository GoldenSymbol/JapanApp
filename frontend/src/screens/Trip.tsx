import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useTripData, cityCardBg } from '../state/TripDataContext';
import { useTheme } from '../state/ThemeContext';

function fmtRange(a: string, b: string) {
  const [, am, ad] = a.split('-');
  const [, bm, bd] = b.split('-');
  return am === bm ? `${ad}–${bd}/${am}` : `${ad}/${am} – ${bd}/${bm}`;
}

export function Trip() {
  const { destinations, refresh } = useTripData();
  const { dark, palette } = useTheme();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ nameHe: '', nameEn: '', startDate: '', endDate: '', transportIn: 'train' });
  const [addError, setAddError] = useState('');

  const first = destinations[0];
  const last = destinations[destinations.length - 1];
  const tripRange = first && last ? fmtRange(first.startDate, last.endDate) : '';

  async function saveDest(id: string, patch: Record<string, any>) {
    await api(`/destinations/${id}`, { method: 'PATCH', json: patch });
    await refresh();
  }
  async function move(id: string, direction: 'up' | 'down') {
    await api(`/destinations/${id}/move`, { method: 'POST', json: { direction } });
    await refresh();
  }
  async function remove(id: string) {
    await api(`/destinations/${id}`, { method: 'DELETE' });
    await refresh();
  }
  function openAddForm() {
    // Default dates so the form works even if the user only types a name
    // and never touches the date pickers.
    const base = last ? new Date(last.endDate) : new Date();
    const start = new Date(base);
    start.setDate(start.getDate() + (last ? 1 : 0));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    setDraft({ nameHe: '', nameEn: '', startDate: toIso(start), endDate: toIso(end), transportIn: 'train' });
    setAddError('');
    setAdding(true);
  }
  async function addDestination() {
    if (!draft.nameHe.trim()) { setAddError('צריך לתת שם ליעד'); return; }
    if (!draft.startDate || !draft.endDate) { setAddError('צריך לבחור תאריך התחלה וסיום'); return; }
    if (draft.endDate < draft.startDate) { setAddError('תאריך הסיום צריך להיות אחרי תאריך ההתחלה'); return; }
    setAddError('');
    await api('/destinations', { method: 'POST', json: draft });
    setDraft({ nameHe: '', nameEn: '', startDate: '', endDate: '', transportIn: 'train' });
    setAdding(false);
    await refresh();
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '12px 22px 20px' }}>
        <div>
          <div style={{ font: "600 30px/1.15 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.5px' }}>המסלול שלי</div>
          <div style={{ font: "400 12.5px/1.4 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7 }}>
            {destinations.length} יעדים · <span dir="ltr">{tripRange}</span>
          </div>
        </div>
        <div className="pill" onClick={() => setEditing((v) => !v)}
          style={{ cursor: 'pointer', border: `1px solid ${editing ? 'var(--accent)' : 'var(--border)'}`, color: editing ? 'var(--accent)' : 'var(--text)', padding: '8px 14px' }}>
          {editing ? 'סיום' : 'עריכה'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 22px' }}>
        {destinations.length === 0 && !editing && (
          <div style={{ border: '1px dashed var(--border)', borderRadius: 18, padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ font: "600 16px/1.4 'Noto Sans Hebrew',sans-serif" }}>עוד לא הוספת יעדים למסלול</div>
            <div style={{ font: "400 12.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 8 }}>
              התחל/י לבנות את הטיול על ידי הוספת היעד הראשון שלך.
            </div>
            <div className="btn btn-accent" style={{ marginTop: 16, padding: '10px 20px', display: 'inline-block' }}
              onClick={() => { setEditing(true); openAddForm(); }}>
              + הוסף יעד למסלול
            </div>
          </div>
        )}
        {destinations.map((c) => (
          <div key={c.id} className="card" style={{ background: cityCardBg(c.colorKey, dark, palette) }}>
            <div className="jp-watermark" style={{ left: 14, top: 4, fontSize: 64 }}>{c.nameJa}</div>
            <div style={{ position: 'relative' }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <input className="field" type="date" value={c.startDate} onChange={(e) => saveDest(c.id, { startDate: e.target.value })} />
                    <input className="field" type="date" value={c.endDate} onChange={(e) => saveDest(c.id, { endDate: e.target.value })} />
                  </div>
                  <input className="field" style={{ fontWeight: 600, fontSize: 17 }} value={c.nameHe} onChange={(e) => saveDest(c.id, { nameHe: e.target.value })} />
                  <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
                    <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => move(c.id, 'up')}>↑</div>
                    <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => move(c.id, 'down')}>↓</div>
                    <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center', color: 'var(--danger)' }} onClick={() => remove(c.id)}>מחק</div>
                  </div>
                </div>
              ) : (
                <div onClick={() => navigate(`/city/${c.id}`)} style={{ cursor: 'pointer' }}>
                  <div dir="ltr" style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', letterSpacing: '.6px', textAlign: 'right' }}>{fmtRange(c.startDate, c.endDate)}</div>
                  <div style={{ font: "600 24px/1.2 'Noto Sans Hebrew',sans-serif", marginTop: 7 }}>{c.nameHe}</div>
                  <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
                    <span className="pill">{c.nights} לילות</span>
                    <span className="pill">{c.attractionCount} אטרקציות</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {editing && !adding && (
          <div className="btn btn-ghost" style={{ borderStyle: 'dashed', textAlign: 'center', padding: 18, borderRadius: 20 }} onClick={openAddForm}>
            + הוסף יעד למסלול
          </div>
        )}
        {editing && adding && (
          <div className="card" style={{ border: '1px dashed var(--border)', background: 'transparent' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <input className="field" placeholder="שם היעד" value={draft.nameHe} onChange={(e) => setDraft({ ...draft, nameHe: e.target.value })} />
              <input className="field" placeholder="שם באנגלית (משפר דיוק במפה) — אופציונלי" dir="ltr" value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} />
              <div style={{ display: 'flex', gap: 7 }}>
                <input className="field" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
                <input className="field" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 6, background: 'var(--card-soft)', border: '1px solid var(--border)', borderRadius: 12, padding: 3 }}>
                {(['train', 'flight'] as const).map((t) => (
                  <div key={t} onClick={() => setDraft({ ...draft, transportIn: t })}
                    style={{ flex: 1, textAlign: 'center', borderRadius: 9, padding: '7px 8px', fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
                      background: draft.transportIn === t ? 'var(--accent)' : 'transparent', color: draft.transportIn === t ? '#fff' : 'var(--text-dim)' }}>
                    {t === 'train' ? 'רכבת' : 'טיסה'}
                  </div>
                ))}
              </div>
              {addError && <div style={{ font: "500 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)' }}>{addError}</div>}
              <div style={{ display: 'flex', gap: 7 }}>
                <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center' }} onClick={addDestination}>הוסף</div>
                <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => { setAdding(false); setAddError(''); }}>ביטול</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
