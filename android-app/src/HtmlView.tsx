import React, { useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from './theme';
import { htmlDocument } from './htmlDocument';

// Shows formatted content (notice details, questions with tables / images) inside the app.
// The HTML comes from the server as data; nothing is loaded from the website. Links open in
// the phone's browser. The view grows to fit its content.

export default function HtmlView({ html, minHeight = 40, css = '', head = '' }: { html: string; minHeight?: number; css?: string; head?: string }) {
  const t = useTheme();
  const [height, setHeight] = useState(minHeight);
  const source = useMemo(() => ({ html: htmlDocument(html, t, css, head), baseUrl: 'https://localhost/' }), [html, t, css, head]);
  return (
    <WebView
      originWhitelist={['*']}
      source={source}
      style={{ height, backgroundColor: 'transparent' }}
      scrollEnabled={false}
      nestedScrollEnabled={false}
      javaScriptEnabled
      setSupportMultipleWindows={false}
      onMessage={e => { try { const h = JSON.parse(e.nativeEvent.data).h; if (h && Math.abs(h - height) > 2) setHeight(Math.max(minHeight, h)); } catch { /* ignore */ } }}
      onShouldStartLoadWithRequest={req => {
        if (req.url.startsWith('https://localhost') || req.url === 'about:blank' || req.url.startsWith('data:')) return true;
        Linking.openURL(req.url).catch(() => {});
        return false;
      }}
    />
  );
}
