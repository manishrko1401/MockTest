"use client";

// Last-resort screen when the root layout itself fails (it replaces the whole page, so it
// carries its own <html>, <body> and inline styles).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', background: '#f5f7fa', color: '#0f172a' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ maxWidth: 420, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, margin: '0 0 6px' }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 16px' }}>कुछ गड़बड़ हो गई। कृपया फिर से प्रयास करें।</p>
            <button
              type="button"
              onClick={() => reset()}
              style={{ height: 40, padding: '0 16px', borderRadius: 6, border: 0, background: '#1e4e79', color: '#fff', fontSize: 14, cursor: 'pointer', marginRight: 8 }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ fontSize: 14, color: '#1e4e79' }}>Home</a>
          </div>
        </div>
      </body>
    </html>
  );
}
