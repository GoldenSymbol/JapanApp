import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useTripData, cityCardBg } from '../state/TripDataContext';
import { useTheme } from '../state/ThemeContext';
import { TAGS } from './City';
import { Drawer } from '../components/Drawer';

function dayLabel(iso: string) {
  const [, m, d] = iso.split('-');
  return { dm: `${d}/${m}` };
}

function countdown(dateIso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateIso + 'T00:00:00');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'היום!';
  if (diffDays > 0) return `עוד ${diffDays} ימים ליום הזה`;
  return `לפני ${-diffDays} ימים`;
}

export function Today() {
  const { destinations, loading: destLoading } = useTripData();
  const { dark, palette } = useTheme();
  const navigate = useNavigate();
  const [date, setDate] = useState<string | null>(null);
  const [attractions, setAttractions] = useState<any[] | null>(null);
  const [moving, setMoving] = useState<any>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const latestReq = useRef(0);
  const initialized = useRef(false);

  // The full day-by-day rail across the whole trip and "which destination is active for this
  // date" are both derivable from destinations we already have via TripDataContext — no server
  // round-trip needed for either.
  const days = useMemo(() => {
    const out: { date: string; destinationId: string; cityHe: string }[] = [];
    for (const d of destinations) {
      let cur = new Date(d.startDate);
      const end = new Date(d.endDate);
      while (cur <= end) {
        out.push({ date: cur.toISOString().slice(0, 10), destinationId: d.id, cityHe: d.nameHe });
        cur.setDate(cur.getDate() + 1);
      }
    }
    return out;
  }, [destinations]);

  const dest = date ? destinations.find((d) => d.startDate <= date && d.endDate >= date) : undefined;

  // Resolve which date to show, once, the first time destinations are ready.
  useEffect(() => {
    if (destLoading || initialized.current) return;
    initialized.current = true;
    const todayIso = new Date().toISOString().slice(0, 10);
    const active = destinations.find((d) => d.startDate <= todayIso && d.endDate >= todayIso);
    setDate(active ? todayIso : destinations[0]?.startDate || todayIso);
  }, [destLoading, destinations]);

  // Fetch attractions only when the active destination actually changes — switching between
  // days within the same city re-filters in memory below, with no extra request at all.
  async function refreshAttractions(destId: string) {
    const reqId = ++latestReq.current;
    const res = await api(`/destinations/${destId}/attractions`);
    if (reqId !== latestReq.current) return;
    setAttractions(res.attractions);
  }
  useEffect(() => {
    if (dest) refreshAttractions(dest.id);
    else setAttractions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest?.id]);

  useEffect(() => {
    if (!railRef.current || !date) return;
    const chip = railRef.current.querySelector(`[data-day="${date}"]`) as HTMLElement;
    if (chip) {
      const rail = railRef.current;
      rail.scrollLeft = chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2;
    }
  }, [date]);

  async function reschedule(spotId: string, day: string) {
    await api(`/attractions/${spotId}`, { method: 'PATCH', json: { day: day || null } });
    setMoving(null);
    if (dest) await refreshAttractions(dest.id);
  }
  async function assignToday(spotId: string) {
    await api(`/attractions/${spotId}`, { method: 'PATCH', json: { day: date } });
    if (dest) await refreshAttractions(dest.id);
  }

  if (!date || !attractions) return null;
  const scheduled = [...attractions.filter((a) => a.day === date)].sort((a, b) => (a.hour || '99:99').localeCompare(b.hour || '99:99'));
  const unscheduled = attractions.filter((a) => !a.day);
  const cityDest = dest;
  const first = scheduled[0];
  const rest = scheduled.slice(1);

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 0 calc(102px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: '12px 22px 14px' }}>
        <div style={{ font: "400 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', letterSpacing: '.8px' }}>{countdown(date)}</div>
        <div style={{ font: "600 30px/1.15 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.5px', marginTop: 8 }}>
          {dest ? dest.nameHe : 'אין יעד ליום זה'}
        </div>
        <div style={{ font: "400 12.5px/1.4 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7 }}>
          {scheduled.length === 0 ? 'אין אטרקציה משובצת' : scheduled.length === 1 ? 'אטרקציה אחת משובצת' : `${scheduled.length} אטרקציות משובצות`}
        </div>
      </div>

      <div ref={railRef} style={{ display: 'flex', gap: 8, overflow: 'auto', padding: '0 22px 18px' }}>
        {days.map((d) => (
          <div key={d.date} data-day={d.date} onClick={() => setDate(d.date)}
            style={{ flex: 'none', minWidth: 62, textAlign: 'center', borderRadius: 14, cursor: 'pointer', padding: '9px 10px',
              background: date === d.date ? 'var(--text)' : 'var(--card-soft)', border: '1px solid var(--border)' }}>
            <div style={{ font: "500 10px 'Noto Sans Hebrew',sans-serif", color: date === d.date ? 'var(--bg)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}>{d.cityHe}</div>
            <div style={{ font: "600 15px 'Noto Sans Hebrew',sans-serif", color: date === d.date ? 'var(--bg)' : 'var(--text)', marginTop: 3 }}>{dayLabel(d.date).dm}</div>
          </div>
        ))}
      </div>

      {scheduled.length > 0 && cityDest ? (
        <div style={{ padding: '0 22px' }}>
          <div className="card" style={{ background: cityCardBg(cityDest.colorKey, dark, palette) }}>
            <div className="jp-watermark" style={{ left: 12, top: -2, fontSize: 70 }}>{cityDest.nameJa}</div>
            <div style={{ position: 'relative' }}>
              <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', letterSpacing: '.6px' }}>{first.hour || 'ראשון ביום'}</div>
              <div style={{ font: "600 21px/1.3 'Noto Sans Hebrew',sans-serif", marginTop: 8 }}>{first.nameHe}</div>
              {first.note && <div style={{ font: "400 12.5px/1.5 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 6, maxWidth: '80%' }}>{first.note}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {first.duration && <span className="pill">{first.duration}</span>}
                <span className="pill" style={{ border: `1px solid ${TAGS[first.tag]?.color}`, background: 'transparent', color: TAGS[first.tag]?.color }}>{TAGS[first.tag]?.label}</span>
                <span onClick={() => setMoving(first)} className="pill" style={{ cursor: 'pointer', fontWeight: 600, border: '1px solid var(--border)' }}>דחה ליום אחר</span>
              </div>
            </div>
          </div>

          <div className="section-label" style={{ padding: '24px 0 6px' }}>{rest.length > 0 ? 'שאר היום' : 'אין עוד אטרקציות ליום הזה'}</div>
          {rest.map((s: any) => (
            <div key={s.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderTop: '1px solid var(--border-soft)', opacity: s.myStatus === 'skipped' ? 0.5 : 1 }}>
              <div style={{ width: 56, flex: 'none', font: "500 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', paddingTop: 2 }}>{s.hour || '—'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ font: "600 15px/1.3 'Noto Sans Hebrew',sans-serif", textDecoration: s.myStatus === 'skipped' ? 'line-through' : 'none' }}>{s.nameHe}</div>
                {s.note && <div style={{ font: "400 12.5px/1.5 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 4 }}>{s.note}</div>}
                <div style={{ display: 'flex', gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
                  {s.duration && <span className="pill">{s.duration}</span>}
                  <span className="pill" style={{ border: `1px solid ${TAGS[s.tag]?.color}`, background: 'transparent', color: TAGS[s.tag]?.color }}>{TAGS[s.tag]?.label}</span>
                  <span onClick={() => setMoving(s)} className="pill" style={{ cursor: 'pointer', border: '1px solid var(--border)' }}>דחה ליום אחר</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ margin: '0 22px', border: '1px dashed var(--border)', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ font: "600 16px 'Noto Sans Hebrew',sans-serif" }}>אין אטרקציה משובצת ליום הזה</div>
          {dest ? (
            <>
              <div style={{ font: "400 12.5px/1.55 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 8 }}>
                אפשר לשבץ אטרקציה לתאריך {dayLabel(date).dm} מתוך מסך {dest.nameHe}, או לשבץ אחת מהרשימה למטה.
              </div>
              <div className="btn btn-accent" style={{ marginTop: 16, display: 'inline-block' }} onClick={() => navigate(`/city/${dest.id}`)}>פתח את {dest.nameHe}</div>
            </>
          ) : (
            <>
              <div style={{ font: "400 12.5px/1.55 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 8 }}>
                אין עדיין יעד מוגדר לתאריך הזה. אפשר להוסיף יעדים למסלול הטיול.
              </div>
              <div className="btn btn-accent" style={{ marginTop: 16, display: 'inline-block' }} onClick={() => navigate('/trip')}>עבור למסלול</div>
            </>
          )}
        </div>
      )}

      {unscheduled.length > 0 && (
        <div style={{ padding: '26px 22px 0' }}>
          <div className="section-label" style={{ paddingBottom: 6 }}>לא שובצו {dest ? `ב${dest.nameHe}` : ''} ({unscheduled.length})</div>
          {unscheduled.map((s: any) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '13px 0', borderTop: '1px solid var(--border-soft)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "500 14px/1.3 'Noto Sans Hebrew',sans-serif" }}>{s.nameHe}</div>
                <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 3 }}>{[s.duration, TAGS[s.tag]?.label].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="pill" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--accent)', border: '1px solid var(--border)' }} onClick={() => assignToday(s.id)}>שבץ ליום זה</div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={!!moving} onClose={() => setMoving(null)}>
        {moving && (
          <>
            <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', letterSpacing: '.6px' }}>דחיית אטרקציה</div>
            <div style={{ font: "600 20px/1.25 'Noto Sans Hebrew',sans-serif", marginTop: 7 }}>{moving.nameHe}</div>
            <div style={{ font: "400 12.5px/1.45 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 6 }}>
              כרגע משובצת ל־{moving.day ? dayLabel(moving.day).dm : '—'}. לאיזה יום להעביר?
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, padding: '20px 0 4px' }}>
              {days.filter((d) => d.destinationId === dest?.id).map((d) => (
                <div key={d.date} onClick={() => reschedule(moving.id, d.date)}
                  style={{ font: "600 14px 'Noto Sans Hebrew',sans-serif", padding: '12px 16px', borderRadius: 14, cursor: 'pointer',
                    border: `1.5px solid ${moving.day === d.date ? 'var(--accent)' : 'var(--border)'}`, color: moving.day === d.date ? 'var(--accent)' : 'var(--text)' }}>
                  {dayLabel(d.date).dm}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '26px 0 0', borderTop: '1px solid var(--border-soft)', marginTop: 22 }}>
              <div onClick={() => setMoving(null)} style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', cursor: 'pointer' }}>ביטול</div>
              <div onClick={() => reschedule(moving.id, '')} style={{ font: "600 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', cursor: 'pointer' }}>הסר תאריך</div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
