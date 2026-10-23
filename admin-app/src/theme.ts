import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// -----------------------------------------------------------------------------
// Mock Test Hub colours (website navy). Light or dark as the staff member picks in More →
// Appearance (or the sun / moon button), or following the phone; remembered on this phone.
// -----------------------------------------------------------------------------

const light = {
  dark: false,
  bg: '#f3f5f9',
  card: '#ffffff',
  cardAlt: '#eef2f7',
  border: '#e3e8ef',
  text: '#0f172a',
  textSoft: '#475569',
  textMuted: '#8a94a6',
  primary: '#1e4e79',
  primaryText: '#ffffff',
  primarySoft: '#e8eff7',
  header: '#ffffff',
  headerText: '#0f172a',
  hero: '#1e4e79',
  heroText: '#ffffff',
  danger: '#dc2626',
  dangerSoft: '#fdecec',
  success: '#15803d',
  successSoft: '#e8f6ec',
  warning: '#b45309',
  warningSoft: '#fff4e0',
  violet: '#6d28d9',
  violetSoft: '#f1ebfd',
  badge: '#e11d48',
  bubbleAdmin: '#1e4e79',
  bubbleAdminText: '#ffffff',
  bubbleStudent: '#ffffff',
  bubbleStudentText: '#0f172a',
  input: '#ffffff',
  overlay: 'rgba(15, 23, 42, 0.5)',
  shadow: '#0f172a',
};

const dark: typeof light = {
  dark: true,
  bg: '#0b111c',
  card: '#131c2b',
  cardAlt: '#1a2536',
  border: '#223047',
  text: '#e8ecf2',
  textSoft: '#a3aec0',
  textMuted: '#6d798c',
  primary: '#6aa7e0',
  primaryText: '#0b111c',
  primarySoft: '#172a42',
  header: '#0b111c',
  headerText: '#e8ecf2',
  hero: '#132a44',
  heroText: '#e8ecf2',
  danger: '#f87171',
  dangerSoft: '#2a1416',
  success: '#4ade80',
  successSoft: '#10261a',
  warning: '#fbbf24',
  warningSoft: '#2d2110',
  violet: '#a78bfa',
  violetSoft: '#221a3a',
  badge: '#f43f5e',
  bubbleAdmin: '#24527f',
  bubbleAdminText: '#ffffff',
  bubbleStudent: '#1a2536',
  bubbleStudentText: '#e8ecf2',
  input: '#0f1724',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

export type Theme = typeof light;
export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'mth_admin_theme';
type Ctx = { t: Theme; mode: ThemeMode; setMode: (m: ThemeMode) => void; toggle: () => void };
const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => { if (v === 'light' || v === 'dark' || v === 'system') setModeState(v); }).catch(() => {});
  }, []);
  const setMode = useCallback((m: ThemeMode) => { setModeState(m); AsyncStorage.setItem(KEY, m).catch(() => {}); }, []);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const t = isDark ? dark : light;
  const toggle = useCallback(() => setMode(isDark ? 'light' : 'dark'), [isDark, setMode]);
  const value = useMemo(() => ({ t, mode, setMode, toggle }), [t, mode, setMode, toggle]);
  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  const system = useColorScheme();
  return ctx ? ctx.t : system === 'dark' ? dark : light;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode outside ThemeProvider');
  return ctx;
}

/** A soft card shadow in light mode (dark mode uses borders). */
export const lift = (t: Theme, level = 1) => (t.dark ? {} : {
  shadowColor: t.shadow, shadowOpacity: 0.06 * level, shadowRadius: 6 * level, shadowOffset: { width: 0, height: 2 * level }, elevation: level * 1.5,
});
