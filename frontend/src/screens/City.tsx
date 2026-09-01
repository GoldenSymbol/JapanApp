import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useTripData, cityCardBg } from '../state/TripDataContext';
import { useTheme } from '../state/ThemeContext';
import { NavigationIcon } from '../components/Icons';

export const TAGS: Record<string, { label: string; color: string }> = {
  park: { label: 'פארק', color: '#7FB069' },
  temple: { label: 'מקדש', color: '#D9564B' },
  street: { label: 'שדרה', color: '#D9A441' },
  attraction: { label: 'אטרקציה', color: '#6FA8DC' },
  food: { label: 'אוכל', color: '#C77DBB' },
};
const DURATIONS = [
  { key: 'hour', label: 'שעה' },
  { key: '2h', label: 'שעתיים' },
  { key: 'half-day', label: 'חצי יום' },
  { key: 'full-day', label: 'יום מלא' },
];

function dateOptions(start: string, end: string) {
  const out: string[] = [];
  let cur = new Date(start);
  const endD = new Date(end);
  while (cur <= endD) { out.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  return out;
}
function dayLabel(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
function navigationUrl(s: any, cityNameEn?: string) {
  const destination = s.lat && s.lng
    ? `${s.lat},${s.lng}`
    : encodeURIComponent([s.nameEn || s.nameHe, cityNameEn, 'Japan'].filter(Boolean).join(', '));
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function City() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { destinations } = useTripData();
  const { dark, palette } = useTheme();
  const city = destinations.find((d) => d.id === id);
  const [spots, setSpots] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nameHe: '', nameEn: '', tag: 'attraction', duration: 'hour', day: '', hour: '' });
  const [showForm, setShowForm] = useState(false);

  async function loadSpots() {
    if (!id) return;
    const data = await api(`/destinations/${id}/attractions`);
    setSpots(data.attractions);
  }
  useEffect(() => { loadSpots(); }, [id]);

  const days = useMemo(() => (city ? dateOptions(city.startDate, city.endDate) : []), [city]);
  const doneCount = spots.filter((s) => s.myStatus === 'done').length;

  async function addSpot() {
    if (!form.nameHe.trim() || !id) return;
    await api(`/destinations/${id}/attractions`, { method: 'POST', json: { ...form, day: form.day || null, hour: form.hour || null } });
    setForm({ nameHe: '', nameEn: '', tag: 'attraction', duration: 'hour', day: '', hour: '' });
    setShowForm(false);
    await loadSpots();
  }
  async function toggleMark(spot: any) {
    const next = spot.myStatus === 'none' ? 'done' : spot.myStatus === 'done' ? 'skipped' : 'none';
    await api(`/attractions/${spot.id}/mark`, { method: 'POST', json: { status: next } });
    await loadSpots();
  }
  async function removeSpot(spotId: string) {
    await api(`/attractions/${spotId}`, { method: 'DELETE' });
    await loadSpots();
  }
  async function setSpotDay(spotId: string, day: string) {
    await api(`/attractions/${spotId}`, { method: 'PATCH', json: { day: day || null } });
    await loadSpots();
  }
  async function setSpotHour(spotId: string, hour: string) {
    await api(`/attractions/${spotId}`, { method: 'PATCH', json: { hour: hour || null } });
    await loadSpots();
  }
  function placeOnMap(spotId: string) {
    navigate('/map', { state: { cityId: id, placeAttractionId: spotId } });
  }

  if (!city) return null;

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 0 24px' }}>
      <div style={{ padding: '6px 22px 0' }}>
        <div onClick={() => navigate('/trip')} style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer', padding: '8px 0' }}>→ חזרה למסלול</div>
      </div>
      <div className="card" style={{ margin: '8px 22px 0', background: cityCardBg(city.colorKey, dark, palette) }}>
        <div className="jp-watermark" style={{ left: 12, top: -4, fontSize: 78 }}>{city.nameJa}</div>
        <div style={{ position: 'relative' }}>
          <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', letterSpacing: '.6px' }}>{city.nights} לילות</div>
          <div style={{ font: "600 30px/1.15 'Noto Sans Hebrew',sans-serif", marginTop: 8, letterSpacing: '-.5px' }}>{city.nameHe}</div>
          {city.teaser && <div style={{ font: "400 12.5px/1.5 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 8, maxWidth: '80%' }}>{city.teaser}</div>}
        </div>
      </div>

      <div style={{ padding: '0 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0 6px' }}>
          <div className="section-label">אטרקציות · הלכנו ל־{doneCount} מתוך {spots.length}</div>
          <div className="pill" onClick={() => setEditing((v) => !v)} style={{ cursor: 'pointer', border: `1px solid ${editing ? 'var(--accent)' : 'var(--border)'}`, color: editing ? 'var(--accent)' : 'var(--text)' }}>
            {editing ? 'סיום' : 'עריכה'}
          </div>
        </div>

        {editing && (
          <div style={{ padding: '6px 0 10px' }}>
            {!showForm ? (
              <div className="btn btn-ghost" style={{ textAlign: 'center', padding: 12, borderStyle: 'dashed' }} onClick={() => setShowForm(true)}>+ הוסף אטרקציה</div>
            ) : (
              <div className="card" style={{ background: 'var(--card-soft)' }}>
                <input className="field" placeholder="שם האטרקציה" value={form.nameHe} onChange={(e) => setForm({ ...form, nameHe: e.target.value })} />
                <input className="field" style={{ marginTop: 8 }} placeholder="שם באנגלית (משפר דיוק במפה) — אופציונלי" dir="ltr" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {Object.entries(TAGS).map(([key, t]) => (
                    <div key={key} onClick={() => setForm({ ...form, tag: key })}
                      style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                        border: `1px solid ${form.tag === key ? t.color : 'var(--border)'}`, color: form.tag === key ? t.color : 'var(--text-dim)' }}>
                      {t.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {DURATIONS.map((d) => (
                    <div key={d.key} onClick={() => setForm({ ...form, duration: d.key })}
                      style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                        border: `1px solid ${form.duration === d.key ? 'var(--accent)' : 'var(--border)'}`, color: form.duration === d.key ? 'var(--accent)' : 'var(--text-dim)' }}>
                      {d.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <div onClick={() => setForm({ ...form, day: '' })}
                    style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11.5, cursor: 'pointer', border: `1px solid ${!form.day ? 'var(--accent)' : 'var(--border)'}`, color: !form.day ? 'var(--accent)' : 'var(--text-dim)' }}>
                    בלי יום
                  </div>
                  {days.map((d) => (
                    <div key={d} onClick={() => setForm({ ...form, day: d })}
                      style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11.5, cursor: 'pointer', border: `1px solid ${form.day === d ? 'var(--accent)' : 'var(--border)'}`, color: form.day === d ? 'var(--accent)' : 'var(--text-dim)' }}>
                      {dayLabel(d)}
                    </div>
                  ))}
                  <input className="field" style={{ width: 70, flex: 'none', padding: '5px 10px', textAlign: 'center' }} placeholder="שעה"
                    value={form.hour} onChange={(e) => setForm({ ...form, hour: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
                  <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center' }} onClick={addSpot}>הוסף</div>
                  <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => setShowForm(false)}>ביטול</div>
                </div>
              </div>
            )}
          </div>
        )}

        {spots.map((s) => (
          <div key={s.id} style={{ display: 'flex', gap: 12, padding: '16px 0', borderTop: '1px solid var(--border-soft)', opacity: s.myStatus === 'skipped' ? 0.5 : 1 }}>
            <div onClick={() => toggleMark(s)} style={{
              width: 24, height: 24, flex: 'none', marginTop: 2, borderRadius: 8, cursor: 'pointer',
              border: `1.5px solid ${s.myStatus === 'done' ? 'var(--accent)' : 'var(--border)'}`,
              background: s.myStatus === 'done' ? 'var(--accent)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 13,
            }}>
              {s.myStatus === 'done' ? '✓' : s.myStatus === 'skipped' ? '✕' : ''}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ font: "600 16px/1.3 'Noto Sans Hebrew',sans-serif", textDecoration: s.myStatus === 'skipped' ? 'line-through' : 'none' }}>{s.nameHe}</div>
                {s.nameEn && <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim-2)' }}>{s.nameEn}</div>}
              </div>
              {s.note && <div style={{ font: "400 13px/1.55 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 5 }}>{s.note}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {s.duration && <span className="pill">{DURATIONS.find((d) => d.key === s.duration)?.label || s.duration}</span>}
                <span className="pill" style={{ border: `1px solid ${TAGS[s.tag]?.color}`, background: 'transparent', color: TAGS[s.tag]?.color }}>{TAGS[s.tag]?.label || s.tag}</span>
                {(s.day || s.hour) && <span dir="ltr" className="pill" style={{ border: '1px solid var(--border)', background: 'transparent' }}>{[s.day && dayLabel(s.day), s.hour].filter(Boolean).join(' · ')}</span>}
                <a href={navigationUrl(s, city.nameEn)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', textDecoration: 'none' }}>
                  <NavigationIcon /> ניווט
                </a>
                {s.othersStatus?.length > 0 && (
                  <span className="pill" style={{ color: 'var(--text-dim)' }}>בת/בן הזוג {s.othersStatus[0] === 'done' ? '✓' : s.othersStatus[0] === 'skipped' ? '✕' : ''}</span>
                )}
                {!s.lat && (
                  <span className="pill" style={{ cursor: 'pointer', border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent' }} onClick={() => placeOnMap(s.id)}>
                    לא ממוקם — סמן מיקום
                  </span>
                )}
                {editing && s.lat && <span className="pill" style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent' }} onClick={() => placeOnMap(s.id)}>עדכן מיקום</span>}
                {editing && <span className="pill" style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent' }} onClick={() => removeSpot(s.id)}>הסר</span>}
              </div>
              {editing && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 10 }}>
                  <div onClick={() => setSpotDay(s.id, '')} style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11, cursor: 'pointer', border: `1px solid ${!s.day ? 'var(--accent)' : 'var(--border)'}`, color: !s.day ? 'var(--accent)' : 'var(--text-dim)' }}>בלי יום</div>
                  {days.map((d) => (
                    <div key={d} onClick={() => setSpotDay(s.id, d)} style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11, cursor: 'pointer', border: `1px solid ${s.day === d ? 'var(--accent)' : 'var(--border)'}`, color: s.day === d ? 'var(--accent)' : 'var(--text-dim)' }}>{dayLabel(d)}</div>
                  ))}
                  <input className="field" style={{ width: 66, flex: 'none', padding: '5px 10px', textAlign: 'center' }} placeholder="שעה" defaultValue={s.hour || ''} onBlur={(e) => setSpotHour(s.id, e.target.value)} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
