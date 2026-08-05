export const ThemeColors = {
  light: {
    bg: '#F8FAFC',          // Slate 50
    card: '#FFFFFF',         // White
    text: '#1F2937',         // Gray 800
    textMuted: '#6B7280',    // Gray 500
    border: '#E5E7EB',       // Gray 200
    headerBg: '#0B1B3D',     // Deep Navy (Ashoka Chakra Navy)
    headerText: '#FFFFFF',   // White
    primary: '#FF9933',      // Indian Flag Saffron Accent
    primarySecondary: '#138808', // Indian Flag Green Accent
    primaryLight: '#FFF7ED', // Soft Saffron Tint
    inputBg: '#FAFAFA',      // Off-white
    inputBorder: '#D1D5DB',  // Gray 300
    bottomNavBg: '#FFFFFF',  // White
    bottomNavBorder: '#FF9933', // Tricolor Saffron border
    textInverse: '#FFFFFF',
    cardLight: '#F9FAFB',
    tricolorBar: ['#FF9933', '#FFFFFF', '#138808'],
  },
  dark: {
    bg: '#0B1329',          // Rich midnight dark navy
    card: '#16223F',         // Slightly lighter navy for cards
    text: '#F8FAFC',         // Slate 50
    textMuted: '#94A3B8',    // Slate 400
    border: '#1F2E54',       // Cohesive navy border
    headerBg: '#080E1E',     // Deeper header navy
    headerText: '#F8FAFC',   // Slate 50
    primary: '#FF9933',      // Vibrant Saffron accent
    primarySecondary: '#10B981', // Vibrant Green accent
    primaryLight: '#16223F', // Card matching accent
    inputBg: '#080E1E',      // Deeper navy inputs
    inputBorder: '#2E3F6F',  // Styled input borders
    bottomNavBg: '#080E1E',  // matching navy bottom nav
    bottomNavBorder: '#FF9933', // Navy border with Saffron highlight
    textInverse: '#FFFFFF',
    cardLight: '#16223F',
    tricolorBar: ['#FF9933', '#FFFFFF', '#138808'],
  }
};

export type Theme = 'light' | 'dark';
