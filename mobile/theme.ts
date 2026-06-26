export const ThemeColors = {
  light: {
    bg: '#F3F4F6',          // Gray 100
    card: '#FFFFFF',         // White
    text: '#1F2937',         // Gray 800
    textMuted: '#6B7280',    // Gray 500
    border: '#E5E7EB',       // Gray 200
    headerBg: '#0F2942',     // Custom Dark Blue
    headerText: '#FFFFFF',   // White
    primary: '#2563EB',      // Blue 600
    primaryLight: '#EFF6FF', // Blue 50
    inputBg: '#FAFAFA',      // Off-white
    inputBorder: '#D1D5DB',  // Gray 300
    bottomNavBg: '#FFFFFF',  // White
    bottomNavBorder: '#E5E7EB', // Gray 200
    textInverse: '#FFFFFF',
    cardLight: '#F9FAFB',
  },
  dark: {
    bg: '#0F172A',          // Slate 900
    card: '#1E293B',         // Slate 800
    text: '#F8FAFC',         // Slate 50
    textMuted: '#94A3B8',    // Slate 400
    border: '#334155',       // Slate 700
    headerBg: '#020617',     // Slate 950
    headerText: '#F8FAFC',   // Slate 50
    primary: '#3B82F6',      // Blue 500
    primaryLight: '#1E293B', // Slate 800
    inputBg: '#0F172A',      // Slate 900
    inputBorder: '#475569',  // Slate 600
    bottomNavBg: '#1E293B',  // Slate 800
    bottomNavBorder: '#334155', // Slate 700
    textInverse: '#FFFFFF',
    cardLight: '#1E293B',
  }
};

export type Theme = 'light' | 'dark';
