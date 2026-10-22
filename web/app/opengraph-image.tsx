import { ImageResponse } from 'next/og';

// The picture shown when a link to the site is shared (WhatsApp, Telegram, X, Facebook…)
export const alt = 'Mock Test Hub: mock tests, typing tests and exam notices';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  const chips = ['SSC', 'Railways', 'Banking', 'Teaching', 'State Exams', 'Typing Tests'];
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f2a44 0%, #1e4e79 100%)', color: '#ffffff', padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 84, height: 84, borderRadius: 20, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* trophy */}
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#1e4e79" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, letterSpacing: -1 }}>
            <span>MockTest</span>
            <span style={{ color: '#93c5fd', marginLeft: 12 }}>Hub</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 1000 }}>
            Mock tests for Govt exams, the way the real exam looks
          </div>
          <div style={{ fontSize: 30, color: '#cbd5e1', maxWidth: 1000 }}>
            Full mock tests, typing tests, results, admit cards and answer keys in one place.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {chips.map((c) => (
              <div key={c} style={{ display: 'flex', fontSize: 24, padding: '8px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)' }}>
                {c}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#93c5fd' }}>mocktesthub.vercel.app</div>
        </div>
      </div>
    ),
    size,
  );
}
