import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { api } from '../api';
import { useTripData, cityCardBg } from '../state/TripDataContext';
import { useTheme } from '../state/ThemeContext';
import { useLanguage } from '../state/LanguageContext';
import { NavigationIcon, DragHandleIcon } from '../components/Icons';

// Colors only — display labels come from translations.ts (city.tag.*) so they follow the UI
// language; the Hebrew key names below are just internal ids, not shown anywhere.
export const TAGS: Record<string, { color: string }> = {
  park: { color: '#7FB069' },
  temple: { color: '#D9564B' },
  street: { color: '#D9A441' },
  attraction: { color: '#6FA8DC' },
  food: { color: '#C77DBB' },
};
const DURATION_KEYS = ['hour', '2h', 'half-day', 'full-day'] as const;
const DURATION_KEY_SET: Set<string> = new Set(DURATION_KEYS);
// Duration is picked from the fixed set above in the add/edit form, but older entries (seeded or
// added before this field existed as an enum) can hold arbitrary freeform text (e.g. "3 hours")
// instead of one of those keys — translate only when it's actually one of the known keys, and
// show anything else exactly as stored rather than leaking a raw, untranslated dictionary key.
function durationLabel(value: string, t: (key: string) => string) {
  return DURATION_KEY_SET.has(value) ? t(`city.duration.${value}`) : value;
}
// Same defensive fallback as durationLabel, for the same reason: tag is picked from TAGS in the
// form, but an older or hand-edited entry could hold something else.
export function tagLabel(value: string, t: (key: string) => string) {
  return TAGS[value] ? t(`city.tag.${value}`) : value;
}

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
  const {
    destinations, refresh: refreshTripData,
    attractionsByDestination, ensureAttractions, refreshAttractions, setAttractionsLocal,
  } = useTripData();
  const { dark, palette } = useTheme();
  const { t, displayName } = useLanguage();
  const city = destinations.find((d) => d.id === id);
  const spots = attractionsByDestination[id || ''] || [];
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nameHe: '', nameEn: '', tag: 'attraction', duration: 'hour', day: '', hour: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { if (id) ensureAttractions(id); }, [id, ensureAttractions]);

  // A place visited more than once on the trip (e.g. Tokyo, then Tokyo again at the end) shares
  // a groupId across those destination entries — so the day-picker offers every day across all
  // of them, not just the one leg of the trip this particular entry covers.
  const days = useMemo(() => {
    if (!city) return [];
    const sameGroup = destinations.filter((d) => d.groupId === city.groupId);
    const all = sameGroup.flatMap((d) => dateOptions(d.startDate, d.endDate));
    return [...new Set(all)].sort();
  }, [city, destinations]);
  const doneCount = spots.filter((s) => s.myStatus === 'done').length;

  async function addSpot() {
    if (!form.nameHe.trim() || !id) return;
    await api(`/destinations/${id}/attractions`, { method: 'POST', json: { ...form, day: form.day || null, hour: form.hour || null } });
    setForm({ nameHe: '', nameEn: '', tag: 'attraction', duration: 'hour', day: '', hour: '' });
    setShowForm(false);
    await Promise.all([refreshAttractions(id), refreshTripData()]);
  }
  async function toggleMark(spot: any) {
    if (!id) return;
    const next = spot.myStatus === 'none' ? 'done' : spot.myStatus === 'done' ? 'skipped' : 'none';
    await api(`/attractions/${spot.id}/mark`, { method: 'POST', json: { status: next } });
    await refreshAttractions(id);
  }
  async function removeSpot(spotId: string) {
    if (!id) return;
    await api(`/attractions/${spotId}`, { method: 'DELETE' });
    await Promise.all([refreshAttractions(id), refreshTripData()]);
  }
  async function setSpotDay(spotId: string, day: string) {
    if (!id) return;
    await api(`/attractions/${spotId}`, { method: 'PATCH', json: { day: day || null } });
    await refreshAttractions(id);
  }
  async function setSpotHour(spotId: string, hour: string) {
    if (!id) return;
    await api(`/attractions/${spotId}`, { method: 'PATCH', json: { hour: hour || null } });
    await refreshAttractions(id);
  }
  async function setSpotName(spotId: string, patch: { nameHe?: string; nameEn?: string }) {
    if (!id) return;
    await api(`/attractions/${spotId}`, { method: 'PATCH', json: patch });
    await refreshAttractions(id);
  }
  async function setSpotTag(spotId: string, tag: string) {
    if (!id) return;
    await api(`/attractions/${spotId}`, { method: 'PATCH', json: { tag } });
    await refreshAttractions(id);
  }
  function placeOnMap(spotId: string) {
    navigate('/map', { state: { cityId: id, placeAttractionId: spotId } });
  }
  async function saveOrder(orderedSpots: any[]) {
    await api(`/destinations/${id}/attractions/reorder`, { method: 'POST', json: { orderedIds: orderedSpots.map((s) => s.id) } });
  }

  if (!city) return null;

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 0 calc(102px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: '6px 22px 0' }}>
        <div onClick={() => navigate('/trip')} style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer', padding: '8px 0' }}>{t('common.backToTrip')}</div>
      </div>
      <div className="card" style={{ margin: '8px 22px 0', background: cityCardBg(city.colorKey, dark, palette) }}>
        <div className="jp-watermark" style={{ left: 12, top: -4, fontSize: 78 }}>{city.nameJa}</div>
        <div style={{ position: 'relative' }}>
          <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', letterSpacing: '.6px' }}>{t('city.nightsCount', { count: city.nights })}</div>
          <div style={{ font: "600 30px/1.15 'Noto Sans Hebrew',sans-serif", marginTop: 8, letterSpacing: '-.5px' }}>{displayName(city)}</div>
          {city.teaser && <div style={{ font: "400 12.5px/1.5 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 8, maxWidth: '80%' }}>{city.teaser}</div>}
        </div>
      </div>

      <div style={{ padding: '0 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0 6px' }}>
          <div className="section-label">{t('city.attractionsHeader', { done: doneCount, total: spots.length })}</div>
          <div className="pill" onClick={() => setEditing((v) => !v)} style={{ cursor: 'pointer', border: `1px solid ${editing ? 'var(--accent)' : 'var(--border)'}`, color: editing ? 'var(--accent)' : 'var(--text)' }}>
            {editing ? t('common.done') : t('common.edit')}
          </div>
        </div>

        {editing && (
          <div style={{ padding: '6px 0 10px' }}>
            {!showForm ? (
              <div className="btn btn-ghost" style={{ textAlign: 'center', padding: 12, borderStyle: 'dashed' }} onClick={() => setShowForm(true)}>{t('city.addAttraction')}</div>
            ) : (
              <div className="card" style={{ background: 'var(--card-soft)' }}>
                <input className="field" placeholder={t('city.namePlaceholder')} value={form.nameHe} onChange={(e) => setForm({ ...form, nameHe: e.target.value })} />
                <input className="field" style={{ marginTop: 8 }} placeholder={t('city.nameEnPlaceholder')} dir="ltr" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {Object.entries(TAGS).map(([key, tag]) => (
                    <div key={key} onClick={() => setForm({ ...form, tag: key })}
                      style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                        border: `1px solid ${form.tag === key ? tag.color : 'var(--border)'}`, color: form.tag === key ? tag.color : 'var(--text-dim)' }}>
                      {t(`city.tag.${key}`)}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {DURATION_KEYS.map((d) => (
                    <div key={d} onClick={() => setForm({ ...form, duration: d })}
                      style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                        border: `1px solid ${form.duration === d ? 'var(--accent)' : 'var(--border)'}`, color: form.duration === d ? 'var(--accent)' : 'var(--text-dim)' }}>
                      {t(`city.duration.${d}`)}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <div onClick={() => setForm({ ...form, day: '' })}
                    style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11.5, cursor: 'pointer', border: `1px solid ${!form.day ? 'var(--accent)' : 'var(--border)'}`, color: !form.day ? 'var(--accent)' : 'var(--text-dim)' }}>
                    {t('city.noDay')}
                  </div>
                  {days.map((d) => (
                    <div key={d} onClick={() => setForm({ ...form, day: d })}
                      style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11.5, cursor: 'pointer', border: `1px solid ${form.day === d ? 'var(--accent)' : 'var(--border)'}`, color: form.day === d ? 'var(--accent)' : 'var(--text-dim)' }}>
                      {dayLabel(d)}
                    </div>
                  ))}
                  <input className="field" style={{ width: 70, flex: 'none', padding: '5px 10px', textAlign: 'center' }} placeholder={t('city.hourPlaceholder')}
                    value={form.hour} onChange={(e) => setForm({ ...form, hour: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
                  <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center' }} onClick={addSpot}>{t('common.add')}</div>
                  <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => setShowForm(false)}>{t('common.cancel')}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <Reorder.Group as="div" axis="y" values={spots} onReorder={(v) => id && setAttractionsLocal(id, v)} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          <AnimatePresence initial={false}>
            {spots.map((s) => (
              <AttractionRow
                key={s.id}
                s={s}
                editing={editing}
                days={days}
                city={city}
                onDragEnd={() => saveOrder(spots)}
                onToggleMark={() => toggleMark(s)}
                onRemove={() => removeSpot(s.id)}
                onPlaceOnMap={() => placeOnMap(s.id)}
                onSetDay={(d: string) => setSpotDay(s.id, d)}
                onSetHour={(h: string) => setSpotHour(s.id, h)}
                onSetName={(patch: { nameHe?: string; nameEn?: string }) => setSpotName(s.id, patch)}
                onSetTag={(tag: string) => setSpotTag(s.id, tag)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>
    </div>
  );
}

function AttractionRow({ s, editing, days, city, onDragEnd, onToggleMark, onRemove, onPlaceOnMap, onSetDay, onSetHour, onSetName, onSetTag }: {
  s: any; editing: boolean; days: string[]; city: any; onDragEnd: () => void;
  onToggleMark: () => void; onRemove: () => void; onPlaceOnMap: () => void;
  onSetDay: (d: string) => void; onSetHour: (h: string) => void;
  onSetName: (patch: { nameHe?: string; nameEn?: string }) => void; onSetTag: (tag: string) => void;
}) {
  const dragControls = useDragControls();
  const { t, displayName } = useLanguage();
  return (
    <Reorder.Item
      value={s}
      as="div"
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: s.myStatus === 'skipped' ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 340 }}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '16px 0', borderTop: '1px solid var(--border-soft)', background: 'var(--bg)' }}
    >
      {editing && (
        <div onPointerDown={(e) => dragControls.start(e)}
          style={{ touchAction: 'none', cursor: 'grab', color: 'var(--text-dim-2)', flex: 'none', marginTop: 3, display: 'flex', alignItems: 'center' }}>
          <DragHandleIcon />
        </div>
      )}
      <div onClick={onToggleMark} style={{
        width: 24, height: 24, flex: 'none', marginTop: 2, borderRadius: 8, cursor: 'pointer',
        border: `1.5px solid ${s.myStatus === 'done' ? 'var(--accent)' : 'var(--border)'}`,
        background: s.myStatus === 'done' ? 'var(--accent)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 13,
      }}>
        {s.myStatus === 'done' ? '✓' : s.myStatus === 'skipped' ? '✕' : ''}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input className="field" style={{ fontWeight: 600 }} defaultValue={s.nameHe}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.nameHe) onSetName({ nameHe: v }); }} />
            <input className="field" dir="ltr" placeholder={t('city.nameEnShort')} defaultValue={s.nameEn || ''}
              onBlur={(e) => { if (e.target.value !== s.nameEn) onSetName({ nameEn: e.target.value }); }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(TAGS).map(([key, tag]) => (
                <div key={key} onClick={() => onSetTag(key)}
                  style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                    border: `1px solid ${s.tag === key ? tag.color : 'var(--border)'}`, color: s.tag === key ? tag.color : 'var(--text-dim)' }}>
                  {t(`city.tag.${key}`)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ font: "600 16px/1.3 'Noto Sans Hebrew',sans-serif", textDecoration: s.myStatus === 'skipped' ? 'line-through' : 'none' }}>{displayName(s)}</div>
            {s.nameEn && <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim-2)' }}>{s.nameEn}</div>}
          </div>
        )}
        {s.note && <div style={{ font: "400 13px/1.55 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 5 }}>{s.note}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {s.duration && <span className="pill">{durationLabel(s.duration, t)}</span>}
          {!editing && <span className="pill" style={{ border: `1px solid ${TAGS[s.tag]?.color}`, background: 'transparent', color: TAGS[s.tag]?.color }}>{tagLabel(s.tag, t)}</span>}
          {(s.day || s.hour) && <span dir="ltr" className="pill" style={{ border: '1px solid var(--border)', background: 'transparent' }}>{[s.day && dayLabel(s.day), s.hour].filter(Boolean).join(' · ')}</span>}
          <a href={navigationUrl(s, city.nameEn)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', textDecoration: 'none' }}>
            <NavigationIcon /> {t('city.navigate')}
          </a>
          {s.othersStatus?.length > 0 && (
            <span className="pill" style={{ color: 'var(--text-dim)' }}>{t('city.partnerStatus')} {s.othersStatus[0] === 'done' ? '✓' : s.othersStatus[0] === 'skipped' ? '✕' : ''}</span>
          )}
          {!s.lat && (
            <span className="pill" style={{ cursor: 'pointer', border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent' }} onClick={onPlaceOnMap}>
              {t('city.unplaced')}
            </span>
          )}
          {editing && s.lat && <span className="pill" style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent' }} onClick={onPlaceOnMap}>{t('city.updateLocation')}</span>}
          {editing && <span className="pill" style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent' }} onClick={onRemove}>{t('city.remove')}</span>}
        </div>
        {editing && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 10 }}>
            <div onClick={() => onSetDay('')} style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11, cursor: 'pointer', border: `1px solid ${!s.day ? 'var(--accent)' : 'var(--border)'}`, color: !s.day ? 'var(--accent)' : 'var(--text-dim)' }}>{t('city.noDay')}</div>
            {days.map((d) => (
              <div key={d} onClick={() => onSetDay(d)} style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11, cursor: 'pointer', border: `1px solid ${s.day === d ? 'var(--accent)' : 'var(--border)'}`, color: s.day === d ? 'var(--accent)' : 'var(--text-dim)' }}>{dayLabel(d)}</div>
            ))}
            <input className="field" style={{ width: 66, flex: 'none', padding: '5px 10px', textAlign: 'center' }} placeholder={t('city.hourPlaceholder')} defaultValue={s.hour || ''} onBlur={(e) => onSetHour(e.target.value)} />
          </div>
        )}
      </div>
    </Reorder.Item>
  );
}
