import React, { useEffect, useMemo, useRef } from 'react';
import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from './theme';
import { questionPage, QuestionPageInput } from './questionHtml';

// One question on screen. The page is built once per question (and language / review mode);
// choosing an option only updates the highlight, so answering is instant.

type Props = Omit<QuestionPageInput, 'mathJaxSrc'> & { pageKey: string; onSelect?: (i: number) => void };

export default function QuestionView({ pageKey, onSelect, ...q }: Props) {
  const t = useTheme();
  const ref = useRef<WebView>(null);
  // Rebuilt only when the question / language / review state changes, not on each selection
  const html = useMemo(
    () => questionPage({ ...q, mathJaxSrc: 'file:///android_asset/mathjax/tex-svg-full.js' }, t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageKey, t, q.fontScale, q.review?.correct, q.review?.chosen, q.watermark],
  );
  useEffect(() => {
    ref.current?.injectJavaScript(`setSel(${q.selected ?? -1}); true;`);
  }, [q.selected]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <WebView
        ref={ref}
        key={pageKey}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'file:///android_asset/' }}
        allowFileAccess
        allowFileAccessFromFileURLs
        javaScriptEnabled
        setSupportMultipleWindows={false}
        textZoom={100}
        style={{ flex: 1, backgroundColor: t.bg }}
        onMessage={e => {
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.type === 'select' && onSelect) onSelect(m.i);
          } catch { /* ignore */ }
        }}
        onShouldStartLoadWithRequest={req => {
          if (req.url.startsWith('file://') || req.url === 'about:blank' || req.url.startsWith('data:')) return true;
          Linking.openURL(req.url).catch(() => {});
          return false;
        }}
      />
    </View>
  );
}
