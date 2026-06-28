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
    bg: '#0B1329',          // Rich midnight dark navy (matches loader!)
    card: '#16223F',         // Slightly lighter navy for cards
    text: '#F8FAFC',         // Slate 50
    textMuted: '#94A3B8',    // Slate 400
    border: '#1F2E54',       // Cohesive navy border
    headerBg: '#080E1E',     // Deeper header navy
    headerText: '#F8FAFC',   // Slate 50
    primary: '#38BDF8',      // Bright sky blue accent for dark mode readability
    primaryLight: '#16223F', // Card matching accent
    inputBg: '#080E1E',      // Deeper navy inputs
    inputBorder: '#2E3F6F',  // Styled input borders
    bottomNavBg: '#080E1E',  // matching navy bottom nav
    bottomNavBorder: '#1F2E54', // Navy border
    textInverse: '#FFFFFF',
    cardLight: '#16223F',
  }
};

export type Theme = 'light' | 'dark';
