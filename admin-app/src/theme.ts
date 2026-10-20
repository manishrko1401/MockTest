import { useColorScheme } from 'react-native';

// Mock Test Hub colours (website navy), with a dark variant that follows the phone setting.
const light = {
  bg: '#f5f7fa',
  card: '#ffffff',
  cardAlt: '#eef3f8',
  border: '#e2e8f0',
  text: '#0f172a',
  textSoft: '#475569',
  textMuted: '#94a3b8',
  primary: '#1e4e79',
  primaryText: '#ffffff',
  primarySoft: '#e7eef6',
  header: '#1e4e79',
  headerText: '#ffffff',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  success: '#16a34a',
  successSoft: '#f0fdf4',
  warning: '#d97706',
  warningSoft: '#fffbeb',
  badge: '#ef4444',
  bubbleAdmin: '#1e4e79',
  bubbleAdminText: '#ffffff',
  bubbleStudent: '#ffffff',
  bubbleStudentText: '#0f172a',
  input: '#ffffff',
  overlay: 'rgba(15, 23, 42, 0.5)',
};

const dark: typeof light = {
  bg: '#0b1220',
  card: '#111a2b',
  cardAlt: '#172338',
  border: '#1f2d44',
  text: '#e2e8f0',
  textSoft: '#94a3b8',
  textMuted: '#64748b',
  primary: '#5b9bd5',
  primaryText: '#0b1220',
  primarySoft: '#16273f',
  header: '#0f1a2c',
  headerText: '#e2e8f0',
  danger: '#f87171',
  dangerSoft: '#2a1215',
  success: '#4ade80',
  successSoft: '#0f2418',
  warning: '#fbbf24',
  warningSoft: '#2a1f0b',
  badge: '#ef4444',
  bubbleAdmin: '#1e4e79',
  bubbleAdminText: '#ffffff',
  bubbleStudent: '#172338',
  bubbleStudentText: '#e2e8f0',
  input: '#0f1a2c',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
