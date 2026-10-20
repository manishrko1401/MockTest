import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from './theme';

// A remote image at full width with its own aspect ratio; tapping it opens it larger.
export default function AutoImage({ uri, maxHeight, zoom = true }: { uri: string; maxHeight?: number; zoom?: boolean }) {
  const t = useTheme();
  const [ratio, setRatio] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    Image.getSize(uri, (w, h) => { if (alive && w && h) setRatio(w / h); }, () => { if (alive) setRatio(1.6); });
    return () => { alive = false; };
  }, [uri]);
  if (!ratio) return <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={t.primary} /></View>;
  return (
    <>
      <Pressable onPress={() => zoom && setOpen(true)} disabled={!zoom}>
        <Image source={{ uri }} resizeMode="contain" style={{ width: '100%', aspectRatio: ratio, maxHeight, backgroundColor: '#fff', borderRadius: 8 }} />
      </Pressable>
      {open ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
            <Pressable onPress={() => setOpen(false)} style={{ position: 'absolute', top: 40, right: 16, zIndex: 2, padding: 8 }} accessibilityLabel="Close"><X size={28} color="#fff" /></Pressable>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} horizontal={ratio > 1.4}>
              <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                <Image source={{ uri }} resizeMode="contain" style={ratio > 1.4 ? { height: 520, aspectRatio: ratio } : { width: 400, aspectRatio: ratio, maxWidth: '100%' }} />
              </ScrollView>
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
