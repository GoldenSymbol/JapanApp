import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';

const AVATAR_COLORS = ['#D9564B', '#7FB069', '#6FA8DC', '#D9A441', '#C77DBB'];
const PALETTES = [
  { key: 'paper', label: 'נייר', swatches: ['#F6F4EF', '#FFFFFF', '#B23A32'] },
  { key: 'sakura', label: 'סאקורה', swatches: ['#FBF3F3', '#FFFFFF', '#C2405A'] },
  { key: 'indigo', label: 'אינדיגו', swatches: ['#F1F3F7', '#FFFFFF', '#2C4A8C'] },
  { key: 'matcha', label: 'מאצ׳ה', swatches: ['#F3F5EE', '#FFFFFF', '#4E7A38'] },
];
const PREF_ROWS = [
  { key: 'weather', label: 'מזג אוויר במסך היום', note: 'טמפרטורה ותחזית ליד האטרקציה הבאה' },
  { key: 'offlineSave', label: 'שמירה לגלישה ללא רשת', note: 'מסלול, מפות ואטרקציות זמינים גם בלי אינטרנט' },
  { key: 'autoSync', label: 'סנכרון אוטומטי', note: 'שינויים של משתתפים מתעדכנים מיד' },
] as const;
const NOTIF_ROWS = [
  { key: 'newAttraction', label: 'אטרקציה חדשה' },
  { key: 'newDestination', label: 'יעד חדש במסלול' },
  { key: 'reschedule', label: 'שינוי תאריך או שעה' },
  { key: 'newExpense', label: 'הוצאה חדשה' },
] as const;
const UI_LANGS = [{ key: 'he', label: 'עברית' }, { key: 'en', label: 'English' }, { key: 'ja', label: '日本語' }];
const CURRENCIES = [{ key: 'ILS', label: '₪ שקל' }, { key: 'JPY', label: '¥ יין' }, { key: 'USD', label: '$ דולר' }, { key: 'EUR', label: '€ אירו' }];

function Toggle({ on }: { on: boolean }) {
  return (
    <div style={{ width: 42, height: 24, flex: 'none', borderRadius: 999, background: on ? 'var(--accent)' : 'var(--card-soft-2)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 3, insetInlineStart: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'inset-inline-start .15s' }} />
    </div>
  );
}

export function Settings() {
  const { user, updateMe, logout } = useAuth();
  const { dark, palette, setDark, setPalette } = useTheme();
  const navigate = useNavigate();
  const [memberCount, setMemberCount] = useState(1);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [photoAsked, setPhotoAsked] = useState(false);

  useEffect(() => {
    api('/trips/current').then((d) => setMemberCount(d.trip?.members?.length || 1));
  }, []);

  if (!user) return null;

  async function leaveTrip() {
    await api('/trips/leave', { method: 'POST' });
    setLeaveOpen(false);
    navigate('/choose');
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 0 24px' }}>
      <div style={{ padding: '6px 22px 0' }}>
        <div onClick={() => navigate('/today')} style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer', padding: '8px 0' }}>→ חזרה</div>
      </div>
      <div style={{ padding: '6px 22px 18px' }}>
        <div style={{ font: "600 29px/1.15 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.5px' }}>הגדרות</div>
        <div style={{ font: "400 12.5px/1.4 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7 }}>{user.name} · {memberCount} משתתפים בטיול</div>
      </div>

      <div className="card" style={{ margin: '0 22px', background: 'var(--card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, flex: 'none', borderRadius: '50%', background: user.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', font: "600 22px 'Noto Sans Hebrew',sans-serif", color: '#14161A' }}>
            {user.name[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input className="field" style={{ fontWeight: 600, fontSize: 15 }} defaultValue={user.name} onBlur={(e) => updateMe({ name: e.target.value })} />
            <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7, direction: 'ltr', textAlign: 'right' }}>{user.email}</div>
          </div>
        </div>
        <div className="section-label" style={{ padding: '18px 0 9px' }}>תמונת פרופיל</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {AVATAR_COLORS.map((c) => (
            <div key={c} onClick={() => updateMe({ avatarColor: c })}
              style={{ width: 34, height: 34, borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${user.avatarColor === c ? 'var(--text)' : 'transparent'}` }} />
          ))}
          <div className="pill" style={{ cursor: 'pointer', border: '1px dashed var(--border)' }} onClick={() => setPhotoAsked(true)}>
            {photoAsked ? 'העלאת תמונה — בקרוב' : '+ העלה תמונה'}
          </div>
        </div>
      </div>

      <div className="section-label" style={{ padding: '26px 22px 10px' }}>תצוגה</div>
      <div style={{ padding: '0 22px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div onClick={() => setDark(true)} className="pill" style={{ flex: 1, textAlign: 'center', padding: 14, cursor: 'pointer', border: `1.5px solid ${dark ? 'var(--accent)' : 'var(--border)'}`, color: dark ? 'var(--accent)' : 'var(--text)' }}>כהה</div>
          <div onClick={() => setDark(false)} className="pill" style={{ flex: 1, textAlign: 'center', padding: 14, cursor: 'pointer', border: `1.5px solid ${!dark ? 'var(--accent)' : 'var(--border)'}`, color: !dark ? 'var(--accent)' : 'var(--text)' }}>בהיר</div>
        </div>
        <div style={{ font: "400 11.5px/1.55 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 10 }}>
          {dark ? 'מצב כהה, מותאם לצילומי מסך בערב ולחיסכון בסוללה.' : `מצב בהיר · ${PALETTES.find((p) => p.key === palette)?.label} — בחר פלטה למטה.`}
        </div>
      </div>

      {!dark && (
        <>
          <div className="section-label" style={{ padding: '22px 22px 10px' }}>פלטת צבעים</div>
          <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PALETTES.map((p) => (
              <div key={p.key} onClick={() => setPalette(p.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, border: `1.5px solid ${palette === p.key ? 'var(--accent)' : 'var(--border)'}`, padding: '13px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: 5, flex: 'none' }}>
                  {p.swatches.map((s, i) => <div key={i} style={{ width: 20, height: 20, borderRadius: '50%', background: s, border: '1px solid var(--border)' }} />)}
                </div>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{p.label}</div>
                {palette === p.key && <div style={{ color: 'var(--accent)', fontWeight: 600 }}>✓</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-label" style={{ padding: '26px 22px 10px' }}>שפת האפליקציה</div>
      <div style={{ padding: '0 22px', display: 'flex', gap: 8 }}>
        {UI_LANGS.map((l) => (
          <div key={l.key} onClick={() => updateMe({ uiLang: l.key })} className="pill" style={{ flex: 1, textAlign: 'center', padding: 13, cursor: 'pointer', border: `1.5px solid ${user.uiLang === l.key ? 'var(--accent)' : 'var(--border)'}`, color: user.uiLang === l.key ? 'var(--accent)' : 'var(--text)' }}>{l.label}</div>
        ))}
      </div>

      <div className="section-label" style={{ padding: '26px 22px 6px' }}>העדפות</div>
      <div style={{ padding: '0 22px' }}>
        {PREF_ROWS.map((p) => (
          <div key={p.key} onClick={() => updateMe({ prefs: { [p.key]: !user.prefs[p.key] } })}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid var(--border-soft)', cursor: 'pointer' }}>
            <div>
              <div style={{ font: "500 14px 'Noto Sans Hebrew',sans-serif" }}>{p.label}</div>
              <div style={{ font: "400 11.5px/1.45 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 4 }}>{p.note}</div>
            </div>
            <Toggle on={user.prefs[p.key]} />
          </div>
        ))}
      </div>

      <div className="section-label" style={{ padding: '26px 22px 6px' }}>מטבע ראשי</div>
      <div style={{ padding: '0 22px', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {CURRENCIES.map((c) => (
          <div key={c.key} onClick={() => updateMe({ baseCurrency: c.key })} className="pill" style={{ cursor: 'pointer', border: `1px solid ${user.baseCurrency === c.key ? 'var(--accent)' : 'var(--border)'}`, color: user.baseCurrency === c.key ? 'var(--accent)' : 'var(--text)' }}>{c.label}</div>
        ))}
      </div>

      <div className="section-label" style={{ padding: '26px 22px 6px' }}>מה שולח התראה</div>
      <div style={{ padding: '0 22px' }}>
        {NOTIF_ROWS.map((n) => (
          <div key={n.key} onClick={() => updateMe({ notifPrefs: { [n.key]: !user.notifPrefs[n.key] } })}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid var(--border-soft)', cursor: 'pointer' }}>
            <div style={{ font: "500 14px 'Noto Sans Hebrew',sans-serif" }}>{n.label}</div>
            <Toggle on={user.notifPrefs[n.key]} />
          </div>
        ))}
      </div>

      <div style={{ padding: '26px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="btn" style={{ border: '1px solid rgba(217,86,75,.4)', color: 'var(--danger)', textAlign: 'center', padding: 15 }} onClick={() => setLeaveOpen(true)}>יציאה מהטיול</div>
        <div className="btn btn-outline" style={{ textAlign: 'center', padding: 15 }} onClick={() => { logout(); navigate('/login'); }}>יציאה מהחשבון</div>
        <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim-2)', textAlign: 'center', paddingTop: 6 }}>גרסה 1.0 · יפן 2027</div>
      </div>

      {leaveOpen && (
        <div className="drawer-overlay" style={{ alignItems: 'center' }} onClick={() => setLeaveOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'calc(100% - 52px)', maxWidth: 400, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, padding: 22 }}>
            <div style={{ font: "600 18px/1.3 'Noto Sans Hebrew',sans-serif" }}>לצאת מהטיול?</div>
            <div style={{ font: "400 12.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 9 }}>
              {memberCount > 1
                ? 'תצא מ״יפן 2027״. הסימונים שלך יימחקו, המסלול יישאר לשאר המשתתפים. אפשר לחזור עם קוד ההזמנה.'
                : 'אתה המשתתף היחיד. יציאה תשאיר את הטיול בלי אף אחד — תוכל לחזור אליו רק עם קוד ההזמנה.'}
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
              <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => setLeaveOpen(false)}>ביטול</div>
              <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center' }} onClick={leaveTrip}>צא מהטיול</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
