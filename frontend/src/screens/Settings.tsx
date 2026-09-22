import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';
import { useLanguage } from '../state/LanguageContext';
import type { Lang } from '../i18n/translations';

const AVATAR_COLORS = ['#D9564B', '#7FB069', '#6FA8DC', '#D9A441', '#C77DBB'];
const PALETTE_KEYS = ['paper', 'sakura', 'indigo', 'matcha'] as const;
const PALETTE_SWATCHES: Record<string, string[]> = {
  paper: ['#F6F4EF', '#FFFFFF', '#B23A32'],
  sakura: ['#FBF3F3', '#FFFFFF', '#C2405A'],
  indigo: ['#F1F3F7', '#FFFFFF', '#2C4A8C'],
  matcha: ['#F3F5EE', '#FFFFFF', '#4E7A38'],
};
const PREF_KEYS = ['weather', 'offlineSave', 'autoSync'] as const;
const NOTIF_KEYS = ['newAttraction', 'newDestination', 'reschedule', 'newExpense'] as const;
const UI_LANGS: { key: Lang; label: string }[] = [{ key: 'he', label: 'עברית' }, { key: 'en', label: 'English' }];
const CURRENCY_KEYS = ['ILS', 'JPY', 'USD', 'EUR'] as const;

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
  const { lang, setLang, t } = useLanguage();
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
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 0 calc(102px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: '6px 22px 0' }}>
        <div onClick={() => navigate('/today')} style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer', padding: '8px 0' }}>{t('settings.back')}</div>
      </div>
      <div style={{ padding: '6px 22px 18px' }}>
        <div style={{ font: "600 29px/1.15 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.5px' }}>{t('settings.title')}</div>
        <div style={{ font: "400 12.5px/1.4 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7 }}>{t('settings.subtitle', { name: user.name, count: memberCount })}</div>
      </div>

      <div className="card" style={{ margin: '0 22px', background: 'var(--card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, flex: 'none', borderRadius: '50%', background: user.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', font: "600 22px 'Noto Sans Hebrew',sans-serif", color: '#14161A' }}>
            {user.name[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input className="field" style={{ fontWeight: 600, fontSize: 16 }} defaultValue={user.name} onBlur={(e) => updateMe({ name: e.target.value })} />
            <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7, direction: 'ltr', textAlign: 'right' }}>{user.email}</div>
          </div>
        </div>
        <div className="section-label" style={{ padding: '18px 0 9px' }}>{t('settings.profilePhoto')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {AVATAR_COLORS.map((c) => (
            <div key={c} onClick={() => updateMe({ avatarColor: c })}
              style={{ width: 34, height: 34, borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${user.avatarColor === c ? 'var(--text)' : 'transparent'}` }} />
          ))}
          <div className="pill" style={{ cursor: 'pointer', border: '1px dashed var(--border)' }} onClick={() => setPhotoAsked(true)}>
            {photoAsked ? t('settings.uploadPhotoSoon') : t('settings.uploadPhoto')}
          </div>
        </div>
      </div>

      <div className="section-label" style={{ padding: '26px 22px 10px' }}>{t('settings.display')}</div>
      <div style={{ padding: '0 22px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div onClick={() => setDark(true)} className="pill" style={{ flex: 1, textAlign: 'center', padding: 14, cursor: 'pointer', border: `1.5px solid ${dark ? 'var(--accent)' : 'var(--border)'}`, color: dark ? 'var(--accent)' : 'var(--text)' }}>{t('settings.dark')}</div>
          <div onClick={() => setDark(false)} className="pill" style={{ flex: 1, textAlign: 'center', padding: 14, cursor: 'pointer', border: `1.5px solid ${!dark ? 'var(--accent)' : 'var(--border)'}`, color: !dark ? 'var(--accent)' : 'var(--text)' }}>{t('settings.light')}</div>
        </div>
        <div style={{ font: "400 11.5px/1.55 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 10 }}>
          {dark ? t('settings.darkNote') : t('settings.lightNote', { palette: t(`settings.palette.${palette}`) })}
        </div>
      </div>

      {!dark && (
        <>
          <div className="section-label" style={{ padding: '22px 22px 10px' }}>{t('settings.palette')}</div>
          <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PALETTE_KEYS.map((p) => (
              <div key={p} onClick={() => setPalette(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, border: `1.5px solid ${palette === p ? 'var(--accent)' : 'var(--border)'}`, padding: '13px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: 5, flex: 'none' }}>
                  {PALETTE_SWATCHES[p].map((s, i) => <div key={i} style={{ width: 20, height: 20, borderRadius: '50%', background: s, border: '1px solid var(--border)' }} />)}
                </div>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{t(`settings.palette.${p}`)}</div>
                {palette === p && <div style={{ color: 'var(--accent)', fontWeight: 600 }}>✓</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-label" style={{ padding: '26px 22px 10px' }}>{t('settings.language')}</div>
      <div style={{ padding: '0 22px', display: 'flex', gap: 8 }}>
        {UI_LANGS.map((l) => (
          <div key={l.key} onClick={() => setLang(l.key)} className="pill" style={{ flex: 1, textAlign: 'center', padding: 13, cursor: 'pointer', border: `1.5px solid ${lang === l.key ? 'var(--accent)' : 'var(--border)'}`, color: lang === l.key ? 'var(--accent)' : 'var(--text)' }}>{l.label}</div>
        ))}
      </div>

      <div className="section-label" style={{ padding: '26px 22px 6px' }}>{t('settings.prefs')}</div>
      <div style={{ padding: '0 22px' }}>
        {PREF_KEYS.map((p) => (
          <div key={p} onClick={() => updateMe({ prefs: { [p]: !user.prefs[p] } })}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid var(--border-soft)', cursor: 'pointer' }}>
            <div>
              <div style={{ font: "500 14px 'Noto Sans Hebrew',sans-serif" }}>{t(`settings.pref.${p}`)}</div>
              <div style={{ font: "400 11.5px/1.45 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 4 }}>{t(`settings.pref.${p}Note`)}</div>
            </div>
            <Toggle on={user.prefs[p]} />
          </div>
        ))}
      </div>

      <div className="section-label" style={{ padding: '26px 22px 6px' }}>{t('settings.currency')}</div>
      <div style={{ padding: '0 22px', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {CURRENCY_KEYS.map((c) => (
          <div key={c} onClick={() => updateMe({ baseCurrency: c })} className="pill" style={{ cursor: 'pointer', border: `1px solid ${user.baseCurrency === c ? 'var(--accent)' : 'var(--border)'}`, color: user.baseCurrency === c ? 'var(--accent)' : 'var(--text)' }}>{t(`currency.${c}`)}</div>
        ))}
      </div>

      <div className="section-label" style={{ padding: '26px 22px 6px' }}>{t('settings.notifHeader')}</div>
      <div style={{ padding: '0 22px' }}>
        {NOTIF_KEYS.map((n) => (
          <div key={n} onClick={() => updateMe({ notifPrefs: { [n]: !user.notifPrefs[n] } })}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid var(--border-soft)', cursor: 'pointer' }}>
            <div style={{ font: "500 14px 'Noto Sans Hebrew',sans-serif" }}>{t(`settings.notif.${n}`)}</div>
            <Toggle on={user.notifPrefs[n]} />
          </div>
        ))}
      </div>

      <div style={{ padding: '26px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="btn" style={{ border: '1px solid rgba(217,86,75,.4)', color: 'var(--danger)', textAlign: 'center', padding: 15 }} onClick={() => setLeaveOpen(true)}>{t('settings.leaveTrip')}</div>
        <div className="btn btn-outline" style={{ textAlign: 'center', padding: 15 }} onClick={() => { logout(); navigate('/login'); }}>{t('settings.logout')}</div>
        <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim-2)', textAlign: 'center', paddingTop: 6 }}>{t('settings.version')}</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim-2)' }}>
          <span onClick={() => navigate('/terms')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{t('common.terms')}</span>
          <span>·</span>
          <span onClick={() => navigate('/privacy')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{t('common.privacy')}</span>
        </div>
      </div>

      <AnimatePresence>
        {leaveOpen && (
          <motion.div
            className="drawer-overlay" style={{ alignItems: 'center' }} onClick={() => setLeaveOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              style={{ width: 'calc(100% - 52px)', maxWidth: 400, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, padding: 22 }}
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', damping: 26, stiffness: 380 }}
            >
              <div style={{ font: "600 18px/1.3 'Noto Sans Hebrew',sans-serif" }}>{t('settings.leaveTripTitle')}</div>
              <div style={{ font: "400 12.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 9 }}>
                {memberCount > 1 ? t('settings.leaveTripDescMulti') : t('settings.leaveTripDescSolo')}
              </div>
              <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
                <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => setLeaveOpen(false)}>{t('common.cancel')}</div>
                <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center' }} onClick={leaveTrip}>{t('settings.leaveTripConfirm')}</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
