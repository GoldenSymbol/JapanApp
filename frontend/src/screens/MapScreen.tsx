import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Polyline } from 'react-leaflet';
import { api } from '../api';
import { useTripData } from '../state/TripDataContext';
import { useTheme } from '../state/ThemeContext';
import { TAGS } from './City';
import { FitBounds, pinIcon } from '../components/LeafletHelpers';
import { MapTiles } from '../components/MapTiles';

export function MapScreen() {
  const { destinations } = useTripData();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'country' | 'city'>('country');
  const [cityId, setCityId] = useState<string | null>(null);

  useEffect(() => {
    if (!cityId && destinations[2]) setCityId(destinations[2].id);
  }, [destinations, cityId]);

  const points = destinations.filter((d) => d.lat && d.lng).map((d) => [d.lat!, d.lng!] as [number, number]);
  const routeColor = '#D9564B';

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 0 24px' }}>
      <div style={{ padding: '12px 22px 14px' }}>
        <div style={{ font: "600 30px/1.15 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.5px' }}>מפת המסלול</div>
        <div style={{ font: "400 12.5px/1.4 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7 }}>
          {mode === 'country' ? 'קו מלא — רכבת · מקווקו — טיסה' : `תכנון יומי בתוך ${destinations.find((d) => d.id === cityId)?.nameHe || ''}`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, margin: '0 22px 16px', background: 'var(--card-soft)', border: '1px solid var(--border)', borderRadius: 14, padding: 4 }}>
        {(['country', 'city'] as const).map((m) => (
          <div key={m} onClick={() => setMode(m)}
            style={{ flex: 1, textAlign: 'center', borderRadius: 11, padding: '9px 8px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-dim)' }}>
            {m === 'country' ? 'מפת יפן' : 'מפה עירונית'}
          </div>
        ))}
      </div>

      {mode === 'country' ? (
        <>
          <div style={{ margin: '0 22px', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
            <MapContainer center={[36.5, 138]} zoom={5} style={{ height: 430, width: '100%' }} scrollWheelZoom={true} attributionControl={false}>
              <MapTiles dark={dark} />
              <FitBounds points={points} />
              {destinations.map((d, i) => {
                const next = destinations[i + 1];
                if (!next || !d.lat || !d.lng || !next.lat || !next.lng) return null;
                const isFlight = next.transportIn === 'flight';
                return (
                  <Polyline key={d.id} positions={[[d.lat, d.lng], [next.lat, next.lng]]}
                    pathOptions={{ color: routeColor, weight: isFlight ? 2 : 2.6, dashArray: isFlight ? '5 6' : undefined, opacity: isFlight ? 0.8 : 1 }} />
                );
              })}
              {destinations.map((d, i) => d.lat && d.lng ? (
                <Marker key={d.id} position={[d.lat, d.lng]}
                  icon={pinIcon({ name: d.nameHe, dotBg: '#14161A', dotBorder: '#F6F4EF', dotText: String(i + 1), size: 20, dark })}
                  eventHandlers={{ click: () => navigate(`/city/${d.id}`) }} />
              ) : null)}
            </MapContainer>
          </div>
          <div style={{ padding: '13px 38px 0', font: "400 11.5px/1.5 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)' }}>
            7 יעדים לפי סדר הנסיעה. אוקינאווה מנותקת מהציר — טיסה מהאנדה וחזרה לטוקיו.
          </div>
          <div style={{ padding: '6px 38px 0', font: "400 10px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', opacity: 0.7 }}>
            © OpenStreetMap contributors · openfreemap.org
          </div>
          <div style={{ display: 'flex', gap: 10, padding: '16px 22px 0' }}>
            <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 16, padding: 15 }}>
              <div style={{ font: "600 20px 'Noto Sans Hebrew',sans-serif" }}>1,780 ק״מ</div>
              <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 5 }}>מרחק מצטבר ביבשה</div>
            </div>
            <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 16, padding: 15 }}>
              <div style={{ font: "600 20px 'Noto Sans Hebrew',sans-serif" }}>7 מקטעים</div>
              <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 5 }}>שינקנסן + 2 טיסות</div>
            </div>
          </div>
        </>
      ) : (
        <CityMap cityId={cityId} setCityId={setCityId} dark={dark} />
      )}
    </div>
  );
}

function CityMap({ cityId, setCityId, dark }: { cityId: string | null; setCityId: (id: string) => void; dark: boolean }) {
  const { destinations } = useTripData();
  const [spots, setSpots] = useState<any[]>([]);
  const [route, setRoute] = useState<string[]>([]);
  const city = destinations.find((d) => d.id === cityId);

  useEffect(() => {
    if (!cityId) return;
    setRoute([]);
    api(`/destinations/${cityId}/attractions`).then((d) => setSpots(d.attractions));
  }, [cityId]);

  const points = useMemo(() => spots.filter((s) => s.lat && s.lng).map((s) => [s.lat, s.lng] as [number, number]), [spots]);
  const routeLine = route.map((id) => spots.find((s) => s.id === id)).filter((s) => s?.lat && s?.lng).map((s) => [s.lat, s.lng] as [number, number]);

  function toggleRoute(id: string) {
    setRoute((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  }
  function moveUp(id: string) {
    setRoute((r) => {
      const idx = r.indexOf(id);
      if (idx <= 0) return r;
      const copy = [...r];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return copy;
    });
  }

  if (!city) return null;

  return (
    <>
      <div style={{ display: 'flex', gap: 7, overflow: 'auto', padding: '0 22px 14px' }}>
        {destinations.map((c) => (
          <div key={c.id} onClick={() => setCityId(c.id)}
            style={{ flex: 'none', borderRadius: 999, padding: '8px 14px', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
              border: `1px solid ${cityId === c.id ? 'var(--accent)' : 'var(--border)'}`, color: cityId === c.id ? 'var(--accent)' : 'var(--text)' }}>
            {c.nameHe}
          </div>
        ))}
      </div>
      <div style={{ margin: '0 22px', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
        {city.lat && city.lng && (
          <MapContainer key={cityId} center={[city.lat, city.lng]} zoom={12} style={{ height: 400, width: '100%' }} scrollWheelZoom={true} attributionControl={false}>
            <MapTiles dark={dark} />
            <FitBounds points={points.length ? points : [[city.lat, city.lng]]} />
            {routeLine.length >= 2 && <Polyline positions={routeLine} pathOptions={{ color: '#D9564B', weight: 3, opacity: 0.9 }} />}
            {spots.filter((s) => s.lat && s.lng).map((s) => {
              const orderIdx = route.indexOf(s.id);
              const inRoute = orderIdx >= 0;
              const tagColor = TAGS[s.tag]?.color || '#6FA8DC';
              return (
                <Marker key={s.id} position={[s.lat, s.lng]}
                  icon={pinIcon({
                    name: s.nameHe,
                    dotBg: inRoute ? '#D9564B' : '#14161A',
                    dotBorder: inRoute ? '#F6F4EF' : tagColor,
                    dotText: inRoute ? String(orderIdx + 1) : '',
                    size: inRoute ? 24 : 18,
                    dark,
                  })}
                  eventHandlers={{ click: () => toggleRoute(s.id) }}
                />
              );
            })}
          </MapContainer>
        )}
      </div>
      <div style={{ padding: '13px 38px 0', font: "400 11.5px/1.5 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)' }}>
        הקש על סימון במפה כדי להוסיף אותו למסלול היומי — הקו האדום מציג את הסדר.
      </div>
      <div style={{ padding: '6px 38px 0', font: "400 10px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', opacity: 0.7 }}>
        © OpenStreetMap contributors · openfreemap.org
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 22px 6px' }}>
        <div className="section-label">{route.length ? `המסלול העירוני · ${route.length} עצירות` : 'המסלול העירוני'}</div>
        <div onClick={() => setRoute([])} style={{ font: "600 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer' }}>נקה</div>
      </div>
      {route.length ? (
        <div style={{ padding: '0 22px' }}>
          {route.map((id, i) => {
            const s = spots.find((x) => x.id === id);
            if (!s) return null;
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: '1px solid var(--border-soft)' }}>
                <div style={{ width: 26, height: 26, flex: 'none', borderRadius: '50%', background: 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "600 14.5px/1.3 'Noto Sans Hebrew',sans-serif" }}>{s.nameHe}</div>
                  <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 3 }}>
                    {[TAGS[s.tag]?.label, s.duration, s.day].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                  <div className="btn btn-outline" style={{ padding: '6px 10px' }} onClick={() => moveUp(id)}>↑</div>
                  <div className="btn btn-outline" style={{ padding: '6px 10px', color: 'var(--danger)' }} onClick={() => toggleRoute(id)}>הסר</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ margin: '0 22px', border: '1px dashed var(--border)', borderRadius: 18, padding: 20, textAlign: 'center', font: "400 12.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)' }}>
          עוד לא בחרת אטרקציות למסלול העירוני. הקש על הסימונים במפה לפי הסדר שבו תרצה לעבור ביניהם.
        </div>
      )}
    </>
  );
}
