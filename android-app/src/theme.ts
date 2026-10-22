import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// -----------------------------------------------------------------------------
// Colours for the whole app. Light and dark are separate, hand-tuned palettes (not an
// automatic flip). The student chooses System / Light / Dark in Me → Appearance; the
// choice is kept on the phone.
// -----------------------------------------------------------------------------

export const light = {
  dark: false,
  bg: '#f3f5f9',
  card: '#ffffff',
  cardAlt: '#eef2f7',
  elevated: '#ffffff',
  border: '#e2e7ef',
  text: '#0f172a',
  textSoft: '#4b5567',
  textMuted: '#8a94a6',
  primary: '#1e4e79',
  primaryStrong: '#163a5c',
  primaryText: '#ffffff',
  primarySoft: '#e6eef7',
  accent: '#d97706',
  accentSoft: '#fff4e0',
  violet: '#7c3aed',
  violetSoft: '#f1eaff',
  teal: '#0f766e',
  tealSoft: '#e3f5f2',
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
  badge: '#e11d48',
  bubbleAdmin: '#1e4e79',
  bubbleAdminText: '#ffffff',
  bubbleStudent: '#ffffff',
  bubbleStudentText: '#0f172a',
  input: '#ffffff',
  overlay: 'rgba(15, 23, 42, 0.45)',
  shadow: '#0f172a',
};

export const dark: typeof light = {
  dark: true,
  bg: '#0b111c',
  card: '#131b28',
  cardAlt: '#1a2434',
  elevated: '#1a2434',
  border: '#243045',
  text: '#e8ecf2',
  textSoft: '#a7b1c0',
  textMuted: '#6d798c',
  primary: '#78aee0',
  primaryStrong: '#a5c9ec',
  primaryText: '#0b111c',
  primarySoft: '#172a40',
  accent: '#f5b04a',
  accentSoft: '#2d2110',
  violet: '#a78bfa',
  violetSoft: '#241b3d',
  teal: '#4fd1c0',
  tealSoft: '#0f2a28',
  header: '#0b111c',
  headerText: '#e8ecf2',
  hero: '#132a44',
  heroText: '#e8ecf2',
  danger: '#f87171',
  dangerSoft: '#2b1416',
  success: '#4ade80',
  successSoft: '#10261a',
  warning: '#fbbf24',
  warningSoft: '#2d2110',
  badge: '#fb7185',
  bubbleAdmin: '#2b5f92',
  bubbleAdminText: '#ffffff',
  bubbleStudent: '#1a2434',
  bubbleStudentText: '#e8ecf2',
  input: '#101826',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

export type Theme = typeof light;
export type ThemeMode = 'system' | 'light' | 'dark';

/** Shadow for raised surfaces (light mode only; dark mode uses borders). */
export const lift = (t: Theme, level: 1 | 2 = 1) => (t.dark ? {} : {
  shadowColor: t.shadow, shadowOpacity: level === 1 ? 0.05 : 0.1, shadowRadius: level === 1 ? 6 : 14,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 6 }, elevation: level === 1 ? 1 : 4,
});

const KEY = 'mth_theme';
type Ctx = { theme: Theme; mode: ThemeMode; setMode: (m: ThemeMode) => void };
const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => { if (v === 'light' || v === 'dark' || v === 'system') setModeState(v); }).catch(() => {});
  }, []);
  const setMode = useCallback((m: ThemeMode) => { setModeState(m); AsyncStorage.setItem(KEY, m).catch(() => {}); }, []);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const value = useMemo(() => ({ theme: isDark ? dark : light, mode, setMode }), [isDark, mode, setMode]);
  return React.createElement(ThemeCtx.Provider, { value }, children);
}

export function useTheme(): Theme {
  const v = useContext(ThemeCtx);
  const system = useColorScheme();
  return v ? v.theme : system === 'dark' ? dark : light;
}

export function useThemeMode() {
  const v = useContext(ThemeCtx);
  return { mode: v?.mode || 'system', setMode: v?.setMode || (() => {}) };
}
