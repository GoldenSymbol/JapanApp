import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface ThemeState {
  dark: boolean;
  palette: string;
  setDark: (v: boolean) => void;
  setPalette: (v: string) => void;
}

const Ctx = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, updateMe } = useAuth();
  const dark = user ? user.darkMode : (localStorage.getItem('jpn2027_dark') ?? 'true') === 'true';
  const palette = user ? user.palette : localStorage.getItem('jpn2027_palette') || 'paper';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-palette', palette);
  }, [dark, palette]);

  const value = useMemo<ThemeState>(() => ({
    dark,
    palette,
    setDark: (v: boolean) => {
      if (user) updateMe({ darkMode: v });
      else localStorage.setItem('jpn2027_dark', String(v));
    },
    setPalette: (v: string) => {
      if (user) updateMe({ palette: v });
      else localStorage.setItem('jpn2027_palette', v);
    },
  }), [dark, palette, user, updateMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
