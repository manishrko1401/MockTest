import React from 'react';
import { useTheme } from './theme';

// Browser preview (development only): the same content without a WebView.
export { htmlDocument } from './htmlDocument';

export default function HtmlView({ html }: { html: string; minHeight?: number; css?: string; head?: string }) {
  const t = useTheme();
  return (
    <div style={{ color: t.text, fontSize: 15, lineHeight: 1.55, overflowWrap: 'anywhere' }}
      dangerouslySetInnerHTML={{ __html: html }} />
  );
}
