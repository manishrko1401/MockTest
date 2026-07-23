export const ThemeColors = {
  light: {
    bg: '#F8FAFC',          // Slate 50
    card: '#FFFFFF',         // White
    text: '#0F172A',         // Slate 900
    textMuted: '#64748B',    // Slate 500
    border: '#E2E8F0',       // Slate 200
    headerBg: '#0F172A',     // Slate 900
    headerText: '#FFFFFF',   // White
    primary: '#4F46E5',      // Indigo 600
    primaryLight: '#EEF2F6', // Indigo 50
    inputBg: '#F1F5F9',      // Slate 100
    inputBorder: '#CBD5E1',  // Slate 300
    bottomNavBg: '#FFFFFF',  // White
    bottomNavBorder: '#E2E8F0', // Slate 200
    textInverse: '#FFFFFF',
    cardLight: '#F8FAFC',
    accentGreen: '#10B981',  // Success/Premium tags
    accentAmber: '#F59E0B',  // Warnings/Suggestions PENDING
    accentRed: '#EF4444',    // Blocked/Reports
  },
  dark: {
    bg: '#0F172A',          // Slate 900
    card: '#1E293B',         // Slate 800
    text: '#F8FAFC',         // Slate 50
    textMuted: '#94A3B8',    // Slate 400
    border: '#334155',       // Slate 700
    headerBg: '#020617',     // Slate 950
    headerText: '#F8FAFC',   // Slate 50
    primary: '#818CF8',      // Indigo 400
    primaryLight: '#1E293B', // Slate 800
    inputBg: '#090D16',      // Slate 950
    inputBorder: '#334155',  // Slate 700
    bottomNavBg: '#020617',  // Slate 950
    bottomNavBorder: '#334155',
    textInverse: '#FFFFFF',
    cardLight: '#1E293B',
    accentGreen: '#34D399',
    accentAmber: '#FBBF24',
    accentRed: '#F87171',
  }
};

export type Theme = 'light' | 'dark';
