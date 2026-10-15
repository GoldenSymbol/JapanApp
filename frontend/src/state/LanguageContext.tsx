import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { translations, type Lang } from '../i18n/translations';
import { JaPlanLoader } from '../components/JaPlanLoader';

export const LANG_STORAGE_KEY = 'jpn2027_lang';

interface LanguageState {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  setLang: (v: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  // Picks the English name of a destination/attraction when the UI is in English and one was
  // entered (nameEn is optional — only filled in when someone typed one for map accuracy), else
  // falls back to the Hebrew name. Free-text fields (notes, budget categories) have no English
  // counterpart and are never touched by this — they always show exactly as typed.
  displayName: (entity: { nameHe: string; nameEn?: string | null }) => string;
}

const Ctx = createContext<LanguageState | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, updateMe } = useAuth();
  const lang: Lang = (user ? user.uiLang : localStorage.getItem(LANG_STORAGE_KEY)) === 'en' ? 'en' : 'he';
  const dir = lang === 'en' ? 'ltr' : 'rtl';
  // For a signed-in user the switch is saved to their profile first and only then takes effect, so
  // cover the wait with the loader instead of leaving the old language sitting there unchanged.
  const [switchingTo, setSwitchingTo] = useState<Lang | null>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const value = useMemo<LanguageState>(() => ({
    lang,
    dir,
    setLang: (v: Lang) => {
      if (!user) { localStorage.setItem(LANG_STORAGE_KEY, v); return; }
      if (v === lang) return;
      setSwitchingTo(v);
      // Held for a moment even when the save is instant, so it reads as a transition, not a flash.
      Promise.all([updateMe({ uiLang: v }).catch(() => {}), new Promise((r) => setTimeout(r, 700))])
        .finally(() => setSwitchingTo(null));
    },
    t: (key: string, vars?: Record<string, string | number>) => {
      const dict = translations[lang];
      const template = dict[key] ?? translations.he[key] ?? key;
      return interpolate(template, vars);
    },
    displayName: (entity: { nameHe: string; nameEn?: string | null }) =>
      lang === 'en' && entity.nameEn ? entity.nameEn : entity.nameHe,
  }), [lang, dir, user, updateMe]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {switchingTo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <JaPlanLoader size={200} label={switchingTo === 'en' ? 'Switching language…' : 'מחליף שפה…'} />
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
