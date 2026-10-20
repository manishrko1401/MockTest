import React from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Inbox, WifiOff } from 'lucide-react-native';
import { useTheme } from './theme';

export function Header({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: t.header, paddingTop: insets.top, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }}>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Back">
            <ArrowLeft color={t.headerText} size={22} />
          </Pressable>
        ) : <View style={{ width: 8 }} />}
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text numberOfLines={1} style={{ color: t.headerText, fontSize: 18, fontWeight: '700' }}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={{ color: t.headerText, opacity: 0.75, fontSize: 12 }}>{subtitle}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>{right}</View>
      </View>
    </View>
  );
}

export function HeaderButton({ icon, onPress, label }: { icon: React.ReactNode; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel={label}>{icon}</Pressable>
  );
}

export function OfflineBar() {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.warningSoft, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <WifiOff size={14} color={t.warning} />
      <Text style={{ color: t.warning, fontSize: 12, fontWeight: '600' }}>No connection. Retrying…</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.card, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border, padding: 14 }, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 }}>
      <Text style={{ color: t.textSoft, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>{children}</Text>
      {right}
    </View>
  );
}

export function Badge({ count, style, inverted }: { count: number; style?: ViewStyle; inverted?: boolean }) {
  const t = useTheme();
  if (!count) return null;
  return (
    <View style={[{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: inverted ? '#ffffff' : t.badge, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, style]}>
      <Text style={{ color: inverted ? t.primary : '#fff', fontSize: 11, fontWeight: '700' }}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

type Tone = 'primary' | 'danger' | 'success' | 'warning' | 'neutral';
export function Pill({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  if (!text) return null;
  const t = useTheme();
  const map = {
    primary: [t.primarySoft, t.primary], danger: [t.dangerSoft, t.danger], success: [t.successSoft, t.success],
    warning: [t.warningSoft, t.warning], neutral: [t.cardAlt, t.textSoft],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Button({ title, onPress, tone = 'primary', icon, loading, disabled, small, style, outline }: {
  title: string; onPress: () => void; tone?: Tone; icon?: React.ReactNode; loading?: boolean; disabled?: boolean; small?: boolean; style?: ViewStyle; outline?: boolean;
}) {
  const t = useTheme();
  const color = { primary: t.primary, danger: t.danger, success: t.success, warning: t.warning, neutral: t.textSoft }[tone];
  const bg = outline ? 'transparent' : color;
  const fg = outline ? color : tone === 'primary' ? t.primaryText : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [{
        height: small ? 36 : 46, borderRadius: 10, paddingHorizontal: small ? 12 : 16, backgroundColor: bg,
        borderWidth: outline ? 1.5 : 0, borderColor: color, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon}
      <Text style={{ color: fg, fontSize: small ? 13 : 15, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={{ color: t.textSoft, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={t.textMuted}
        {...props}
        style={[{
          backgroundColor: t.input, color: t.text, borderWidth: 1, borderColor: t.border, borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: props.multiline ? 10 : 0, minHeight: 46, fontSize: 15,
          textAlignVertical: props.multiline ? 'top' : 'center',
        }, style]}
      />
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string; count?: number }[]; value: K; onChange: (k: K) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? t.primary : t.card, borderWidth: 1, borderColor: on ? t.primary : t.border }}>
            <Text style={{ color: on ? t.primaryText : t.text, fontWeight: '700', fontSize: 13 }}>{o.label}</Text>
            {o.count ? <Badge count={o.count} inverted={on} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ListRow({ onPress, left, title, subtitle, meta, right, unread }: {
  onPress?: () => void; left?: React.ReactNode; title: string; subtitle?: string; meta?: string; right?: React.ReactNode; unread?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12,
      backgroundColor: pressed ? t.cardAlt : unread ? t.primarySoft : t.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border,
    })}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: t.text, fontSize: 15, fontWeight: unread ? '800' : '600' }}>{title}</Text>
          {meta ? <Text style={{ color: unread ? t.primary : t.textMuted, fontSize: 12, fontWeight: unread ? '700' : '400' }}>{meta}</Text> : null}
        </View>
        {subtitle ? <Text numberOfLines={2} style={{ color: unread ? t.text : t.textSoft, fontSize: 13, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Avatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  const t = useTheme();
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
  const hue = [...(name || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue}, 45%, ${t.bg === '#0b1220' ? 30 : 88}%)`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: `hsl(${hue}, 55%, ${t.bg === '#0b1220' ? 85 : 30}%)`, fontWeight: '800', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Empty({ title, text, icon }: { title: string; text?: string; icon?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
      {icon || <Inbox size={40} color={t.textMuted} />}
      <Text style={{ color: t.text, fontWeight: '700', fontSize: 16, marginTop: 12 }}>{title}</Text>
      {text ? <Text style={{ color: t.textSoft, textAlign: 'center', marginTop: 4 }}>{text}</Text> : null}
    </View>
  );
}

export function Loading() {
  const t = useTheme();
  return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={t.primary} size="large" /></View>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ margin: 12, padding: 12, borderRadius: 10, backgroundColor: t.dangerSoft }}>
      <Text style={{ color: t.danger, fontWeight: '600' }}>{message}</Text>
      {onRetry ? <Pressable onPress={onRetry} style={{ marginTop: 6 }}><Text style={{ color: t.danger, fontWeight: '800' }}>Try again</Text></Pressable> : null}
    </View>
  );
}

export function KeyValue({ label, value }: { label: string; value?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border, gap: 12 }}>
      <Text style={{ color: t.textSoft, width: 110, fontSize: 13 }}>{label}</Text>
      <View style={{ flex: 1 }}>{typeof value === 'string' || typeof value === 'number' || value == null ? <Text selectable style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>{value ?? '—'}</Text> : value}</View>
    </View>
  );
}

export function confirm(title: string, message: string, yes: string, onYes: () => void, destructive = true) {
  // Browser preview (development): Alert has no buttons there
  if (Platform.OS === 'web') { if ((globalThis as any).confirm?.(`${title}

${message}`)) onYes(); return; }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: yes, style: destructive ? 'destructive' : 'default', onPress: onYes },
  ]);
}

export function timeAgo(iso?: string | null) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function dateTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const stripHtml = (s?: string | null) => String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[ \t]+/g, ' ').trim();
