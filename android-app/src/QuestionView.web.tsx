import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { useTheme } from './theme';
import { questionPage, QuestionPageInput } from './questionHtml';

// Browser preview (development only): the same page in an iframe, MathJax from a CDN.

type Props = Omit<QuestionPageInput, 'mathJaxSrc'> & { pageKey: string; onSelect?: (i: number) => void };

export default function QuestionView({ pageKey, onSelect, ...q }: Props) {
  const t = useTheme();
  const frame = useRef<HTMLIFrameElement | null>(null);
  const html = useMemo(
    () => questionPage({ ...q, mathJaxSrc: 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg-full.js' }, t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageKey, t, q.fontScale, q.review?.correct, q.review?.chosen, q.watermark],
  );
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      try { const m = JSON.parse(e.data); if (m.type === 'select' && onSelect) onSelect(m.i); } catch { /* ignore */ }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onSelect]);
  useEffect(() => { (frame.current?.contentWindow as any)?.setSel?.(q.selected ?? -1); }, [q.selected]);
  return (
    <View style={{ flex: 1 }}>
      <iframe ref={frame} key={pageKey} srcDoc={html} title="question" style={{ border: 0, width: '100%', height: '100%', background: t.bg }} />
    </View>
  );
}
