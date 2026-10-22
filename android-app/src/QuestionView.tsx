import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Pressable, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from './theme';
import { questionPage, QuestionPageInput, zoomPage } from './questionHtml';

// One question on screen. The page is built once per question (and language / review mode);
// choosing an option only updates the highlight, so answering is instant. Tapping a picture
// opens it full screen with pinch zoom.

type Props = Omit<QuestionPageInput, 'mathJaxSrc'> & { pageKey: string; onSelect?: (i: number) => void };

export default function QuestionView({ pageKey, onSelect, ...q }: Props) {
  const t = useTheme();
  const ref = useRef<WebView>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  // Rebuilt only when the question / language / review state / theme / text size changes, not on each selection
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
        onLoadEnd={() => ref.current?.injectJavaScript(`setSel(${q.selected ?? -1}); true;`)}
        onMessage={e => {
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.type === 'select' && onSelect) onSelect(m.i);
            if (m.type === 'zoom' && typeof m.src === 'string') setZoom(m.src);
          } catch { /* ignore */ }
        }}
        onShouldStartLoadWithRequest={req => {
          if (req.url.startsWith('file://') || req.url === 'about:blank' || req.url.startsWith('data:')) return true;
          Linking.openURL(req.url).catch(() => {});
          return false;
        }}
      />
      {zoom ? <ZoomView src={zoom} onClose={() => setZoom(null)} /> : null}
    </View>
  );
}

function ZoomView({ src, onClose }: { src: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <WebView originWhitelist={['*']} source={{ html: zoomPage(src) }} style={{ flex: 1, backgroundColor: '#000' }} setBuiltInZoomControls setDisplayZoomControls={false} />
        <Pressable onPress={onClose} accessibilityLabel="Close"
          style={{ position: 'absolute', top: insets.top + 10, right: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <X size={24} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}
