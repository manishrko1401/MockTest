import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Inbox, Moon, Search, Sun, WifiOff } from 'lucide-react-native';
import { lift, useTheme, useThemeMode } from './theme';

// -----------------------------------------------------------------------------
// The admin app's building blocks. Every screen is made from these, so the look (light and
// dark) is decided here. Touch targets are 44 px or more.
// -----------------------------------------------------------------------------

/** Screen header. `large` for the main tabs (big title); `onBack` for screens opened on top. */
export function Header({ title, subtitle, onBack, right, large }: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode; large?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: t.header, paddingTop: insets.top, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }}>
      <View style={{ minHeight: large ? 64 : 56, flexDirection: 'row', alignItems: 'center', paddingLeft: onBack ? 4 : 16, paddingRight: 6 }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back"
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.cardAlt : 'transparent' })}>
            <ArrowLeft color={t.headerText} size={22} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, marginLeft: onBack ? 2 : 0, paddingVertical: 6 }}>
          <Text numberOfLines={1} style={{ color: t.headerText, fontSize: large ? 24 : 18, fontWeight: '800', letterSpacing: large ? -0.3 : 0 }}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={{ color: t.textSoft, fontSize: 12.5, marginTop: 1 }}>{subtitle}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>{right}</View>
      </View>
    </View>
  );
}

export function HeaderButton({ icon, onPress, label }: { icon: React.ReactNode; onPress: () => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.cardAlt : 'transparent' })}>
      {icon}
    </Pressable>
  );
}

/** Sun / moon: switches between light and dark. */
export function ThemeButton() {
  const t = useTheme();
  const { toggle } = useThemeMode();
  return <HeaderButton label={t.dark ? 'Light theme' : 'Dark theme'} onPress={toggle} icon={t.dark ? <Sun color={t.headerText} size={21} /> : <Moon color={t.headerText} size={21} />} />;
}

export function OfflineBar() {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.warningSoft, paddingVertical: 7, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <WifiOff size={14} color={t.warning} />
      <Text style={{ color: t.warning, fontSize: 12.5, fontWeight: '700' }}>No connection. Retrying…</Text>
    </View>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const t = useTheme();
  const base: ViewStyle = { backgroundColor: t.card, borderRadius: 16, borderWidth: t.dark ? 1 : StyleSheet.hairlineWidth, borderColor: t.border, padding: 14, ...lift(t) };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}>{children}</Pressable>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8, paddingHorizontal: 2 }}>
      <Text style={{ color: t.textSoft, fontSize: 12, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' }}>{children}</Text>
      {right}
    </View>
  );
}

export function Badge({ count, style, inverted }: { count: number; style?: ViewStyle; inverted?: boolean }) {
  const t = useTheme();
  if (!count) return null;
  return (
    <View style={[{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: inverted ? '#ffffff' : t.badge, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, style]}>
      <Text style={{ color: inverted ? t.primary : '#fff', fontSize: 11, fontWeight: '800' }}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export type Tone = 'primary' | 'danger' | 'success' | 'warning' | 'neutral' | 'violet';
export const toneColors = (t: ReturnType<typeof useTheme>, tone: Tone): [string, string] => ({
  primary: [t.primarySoft, t.primary], danger: [t.dangerSoft, t.danger], success: [t.successSoft, t.success],
  warning: [t.warningSoft, t.warning], neutral: [t.cardAlt, t.textSoft], violet: [t.violetSoft, t.violet],
} as Record<Tone, [string, string]>)[tone];

export function Pill({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  const t = useTheme();
  const [bg, fg] = toneColors(t, tone);
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 11.5, fontWeight: '800' }}>{text}</Text>
    </View>
  );
}

export function Button({ title, onPress, tone = 'primary', icon, loading, disabled, small, style, outline }: {
  title: string; onPress: () => void; tone?: Tone; icon?: React.ReactNode; loading?: boolean; disabled?: boolean; small?: boolean; style?: ViewStyle; outline?: boolean;
}) {
  const t = useTheme();
  const color = { primary: t.primary, danger: t.danger, success: t.success, warning: t.warning, neutral: t.textSoft, violet: t.violet }[tone];
  const bg = outline ? 'transparent' : color;
  const fg = outline ? color : tone === 'primary' ? t.primaryText : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [{
        minHeight: small ? 40 : 48, borderRadius: 12, paddingHorizontal: small ? 12 : 18, backgroundColor: bg,
        borderWidth: outline ? 1.5 : 0, borderColor: color, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon}
      <Text style={{ color: fg, fontSize: small ? 13.5 : 15, fontWeight: '800' }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={{ color: t.textSoft, fontSize: 13, fontWeight: '700', marginBottom: 6 }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={t.textMuted}
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        style={[{
          backgroundColor: t.input, color: t.text, borderWidth: focused ? 1.5 : 1, borderColor: focused ? t.primary : t.border, borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: props.multiline ? 12 : 0, minHeight: 48, fontSize: 15,
          textAlignVertical: props.multiline ? 'top' : 'center',
        }, style]}
      />
    </View>
  );
}

/** A search box with an icon (lists). */
export function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.input }}>
      <Search size={18} color={t.textMuted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={t.textMuted}
        autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={{ flex: 1, color: t.text, fontSize: 15 }} />
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string; count?: number }[]; value: K; onChange: (k: K) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 15, borderRadius: 999, backgroundColor: on ? t.primary : t.card, borderWidth: 1, borderColor: on ? t.primary : t.border }}>
            <Text style={{ color: on ? t.primaryText : t.text, fontWeight: '800', fontSize: 13 }}>{o.label}</Text>
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
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13,
      backgroundColor: pressed ? t.cardAlt : unread ? t.primarySoft : t.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border,
    })}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: t.text, fontSize: 15, fontWeight: unread ? '900' : '700' }}>{title}</Text>
          {meta ? <Text style={{ color: unread ? t.primary : t.textMuted, fontSize: 12, fontWeight: unread ? '800' : '500' }}>{meta}</Text> : null}
        </View>
        {subtitle ? <Text numberOfLines={2} style={{ color: unread ? t.text : t.textSoft, fontSize: 13, marginTop: 3, lineHeight: 18 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

/** A row of a settings-style menu: icon tile, title, subtitle, and a chevron / value / switch. */
export function MenuRow({ icon: Icon, color, title, subtitle, onPress, value, switchValue, onSwitch, last, danger }: {
  icon: any; color?: string; title: string; subtitle?: string; onPress?: () => void; value?: string;
  switchValue?: boolean; onSwitch?: (v: boolean) => void; last?: boolean; danger?: boolean;
}) {
  const t = useTheme();
  const c = danger ? t.danger : color || t.primary;
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60, backgroundColor: pressed ? t.cardAlt : 'transparent', borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.border })}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c + (t.dark ? '33' : '18'), alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} color={c} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: danger ? t.danger : t.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={{ color: t.textSoft, fontSize: 12.5, marginTop: 1 }} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {onSwitch ? <Switch value={!!switchValue} onValueChange={onSwitch} trackColor={{ true: t.primary, false: t.border }} thumbColor="#ffffff" /> : null}
      {value ? <Text style={{ color: t.textMuted, fontSize: 13, fontWeight: '600' }}>{value}</Text> : null}
      {onPress && !onSwitch ? <ChevronRight size={18} color={t.textMuted} /> : null}
    </Pressable>
  );
}

/** A group of MenuRows in one card. */
export function MenuCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.card, borderRadius: 16, borderWidth: t.dark ? 1 : StyleSheet.hairlineWidth, borderColor: t.border, overflow: 'hidden', ...lift(t) }, style]}>{children}</View>;
}

/** A number with a label (dashboards, user stats). */
export function Stat({ value, label, color }: { value: React.ReactNode; label: string; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ color: color || t.text, fontSize: 21, fontWeight: '900' }} numberOfLines={1}>{value}</Text>
      <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 1 }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 42 }: { name?: string | null; size?: number }) {
  const t = useTheme();
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
  const hue = [...(name || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue}, 45%, ${t.dark ? 28 : 88}%)`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: `hsl(${hue}, 55%, ${t.dark ? 85 : 30}%)`, fontWeight: '900', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Empty({ title, text, icon }: { title: string; text?: string; icon?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 52, paddingHorizontal: 28 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
        {icon || <Inbox size={32} color={t.textMuted} />}
      </View>
      <Text style={{ color: t.text, fontWeight: '800', fontSize: 16, marginTop: 14, textAlign: 'center' }}>{title}</Text>
      {text ? <Text style={{ color: t.textSoft, textAlign: 'center', marginTop: 5, lineHeight: 20 }}>{text}</Text> : null}
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
    <View style={{ margin: 12, padding: 12, borderRadius: 12, backgroundColor: t.dangerSoft, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ color: t.danger, fontWeight: '700', flex: 1 }}>{message}</Text>
      {onRetry ? <Pressable onPress={onRetry} hitSlop={8}><Text style={{ color: t.danger, fontWeight: '900' }}>Try again</Text></Pressable> : null}
    </View>
  );
}

export function KeyValue({ label, value }: { label: string; value?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border, gap: 12 }}>
      <Text style={{ color: t.textSoft, width: 118, fontSize: 13 }}>{label}</Text>
      <View style={{ flex: 1 }}>{typeof value === 'string' || typeof value === 'number' || value == null ? <Text selectable style={{ color: t.text, fontSize: 13.5, fontWeight: '700' }}>{value ?? '—'}</Text> : value}</View>
    </View>
  );
}

export function confirm(title: string, message: string, yes: string, onYes: () => void, destructive = true) {
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

/** FlatList settings that keep long lists smooth on low-end phones. */
export const listPerf = { initialNumToRender: 12, maxToRenderPerBatch: 12, windowSize: 9, removeClippedSubviews: true } as const;
