import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';
import { ArrowLeft, CircleAlert, Inbox, Search, WifiOff, X } from 'lucide-react-native';
import { lift, useTheme } from './theme';

// -----------------------------------------------------------------------------
// The app's building blocks. Every screen is made from these, so the look (light and dark)
// is decided here: surfaces, type sizes, spacing and touch targets (44 px or more).
// -----------------------------------------------------------------------------

export const R = { card: 16, control: 12, pill: 999 } as const;
export const S = { screen: 16 } as const;

// ---- App bar ---------------------------------------------------------------------------------

// ---- Status bar (the phone's clock, network and battery) ----
// The app draws edge to edge: the status bar is see-through, so each screen keeps something
// behind it and picks light or dark icons for that background. The newest screen's choice wins;
// going back restores the one below.

/** True for dark colours (#rrggbb), which need light status-bar icons. */
export function isDarkColor(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map(x => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.55;
}

/** Status-bar icons that are readable on this background colour. */
export function StatusBarFor({ color }: { color: string }) {
  return <StatusBar style={isDarkColor(color) ? 'light' : 'dark'} />;
}

/**
 * A fixed strip behind the status bar, for screens whose content scrolls (no fixed header):
 * the page slides under it instead of under the clock. Put it after the scroll view.
 */
export function StatusBarCover({ color }: { color: string }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBarFor color={color} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: color, zIndex: 20, elevation: 20 }} />
    </>
  );
}

export function Header({ title, subtitle, onBack, right, large, border = true }: {
  title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode; large?: boolean; border?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: t.header, paddingTop: insets.top, borderBottomWidth: border ? StyleSheet.hairlineWidth : 0, borderBottomColor: t.border }}>
      <StatusBarFor color={t.header} />
      <View style={{ minHeight: large ? 64 : 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: onBack ? 6 : S.screen, paddingRight: 8 }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.cardAlt : 'transparent' })} accessibilityRole="button" accessibilityLabel="Back">
            <ArrowLeft color={t.headerText} size={22} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, marginLeft: onBack ? 4 : 0, paddingVertical: 6 }}>
          <Text numberOfLines={1} style={{ color: t.headerText, fontSize: large ? 24 : 18, fontWeight: '800', letterSpacing: large ? -0.3 : 0 }}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={{ color: t.textSoft, fontSize: 12.5, marginTop: 1 }}>{subtitle}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>{right}</View>
      </View>
    </View>
  );
}

export function HeaderButton({ icon, onPress, label, badge }: { icon: React.ReactNode; onPress: () => void; label: string; badge?: number }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.cardAlt : 'transparent' })}>
      {icon}
      {badge ? <Badge count={badge} style={{ position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18 }} /> : null}
    </Pressable>
  );
}

export function OfflineBar() {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.warningSoft, paddingVertical: 8, paddingHorizontal: S.screen, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <WifiOff size={15} color={t.warning} />
      <Text style={{ color: t.warning, fontSize: 12.5, fontWeight: '700' }}>No connection. Retrying…</Text>
    </View>
  );
}

// ---- Surfaces ---------------------------------------------------------------------------------

export function Card({ children, style, onPress, flat }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void; flat?: boolean }) {
  const t = useTheme();
  const base: ViewStyle = { backgroundColor: t.card, borderRadius: R.card, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border, padding: 16, ...(flat ? {} : lift(t)) };
  if (!onPress) return <View style={[base, style as any]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, style as any, pressed ? { backgroundColor: t.cardAlt, transform: [{ scale: 0.99 }] } : null]}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children, right, style }: { children: React.ReactNode; right?: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }, style]}>
      <Text style={{ color: t.text, fontSize: 16, fontWeight: '800', letterSpacing: -0.1 }}>{children}</Text>
      {right}
    </View>
  );
}

export function LinkText({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const t = useTheme();
  return <Pressable onPress={onPress} hitSlop={10}><Text style={{ color: t.primary, fontWeight: '700', fontSize: 13.5 }}>{children}</Text></Pressable>;
}

export function Divider({ style }: { style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: t.border }, style]} />;
}

// ---- Small labels -----------------------------------------------------------------------------

export function Badge({ count, style, inverted }: { count: number; style?: ViewStyle; inverted?: boolean }) {
  const t = useTheme();
  if (!count) return null;
  return (
    <View style={[{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: inverted ? '#ffffff' : t.badge, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, style]}>
      <Text style={{ color: inverted ? t.primary : '#fff', fontSize: 11, fontWeight: '800' }}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export type Tone = 'primary' | 'danger' | 'success' | 'warning' | 'neutral' | 'violet' | 'teal';
export function toneColors(t: ReturnType<typeof useTheme>, tone: Tone): [string, string] {
  return ({
    primary: [t.primarySoft, t.primary], danger: [t.dangerSoft, t.danger], success: [t.successSoft, t.success],
    warning: [t.warningSoft, t.warning], neutral: [t.cardAlt, t.textSoft], violet: [t.violetSoft, t.violet], teal: [t.tealSoft, t.teal],
  } as const)[tone] as [string, string];
}

export function Pill({ text, tone = 'neutral', icon }: { text: string; tone?: Tone; icon?: React.ReactNode }) {
  const t = useTheme();
  if (!text) return null;
  const [bg, fg] = toneColors(t, tone);
  return (
    <View style={{ backgroundColor: bg, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {icon}
      <Text style={{ color: fg, fontSize: 11.5, fontWeight: '800' }}>{text}</Text>
    </View>
  );
}

// ---- Buttons ----------------------------------------------------------------------------------

export function Button({ title, onPress, tone = 'primary', icon, loading, disabled, small, style, outline, soft }: {
  title: string; onPress: () => void; tone?: Tone; icon?: React.ReactNode; loading?: boolean; disabled?: boolean; small?: boolean; style?: ViewStyle; outline?: boolean; soft?: boolean;
}) {
  const t = useTheme();
  const solid = ({ primary: t.primary, danger: t.danger, success: t.success, warning: t.accent, neutral: t.textSoft, violet: t.violet, teal: t.teal } as const)[tone];
  const [softBg, softFg] = toneColors(t, tone);
  const bg = outline ? 'transparent' : soft ? softBg : solid;
  const fg = outline ? solid : soft ? softFg : tone === 'primary' ? t.primaryText : (t.dark && (tone === 'warning' || tone === 'success' || tone === 'teal')) ? '#0b111c' : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading) }}
      style={({ pressed }) => [{
        height: small ? 40 : 50, borderRadius: R.control, paddingHorizontal: small ? 14 : 18, backgroundColor: bg,
        borderWidth: outline ? 1.5 : 0, borderColor: outline ? solid : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: disabled ? 0.45 : pressed ? 0.88 : 1, transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon}
      <Text numberOfLines={1} style={{ color: fg, fontSize: small ? 13.5 : 15.5, fontWeight: '800' }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tone = 'neutral', size = 44, style }: { icon: React.ReactNode; onPress: () => void; label: string; tone?: Tone; size?: number; style?: ViewStyle }) {
  const t = useTheme();
  const [bg] = toneColors(t, tone);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, opacity: pressed ? 0.75 : 1 }, style]}>
      {icon}
    </Pressable>
  );
}

// ---- Inputs ----------------------------------------------------------------------------------

export function Field({ label, style, error, hint, ...props }: TextInputProps & { label?: string; error?: string; hint?: string }) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={{ color: t.textSoft, fontSize: 13, fontWeight: '700', marginBottom: 7 }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={t.textMuted}
        {...props}
        onFocus={e => { setFocus(true); props.onFocus?.(e); }}
        onBlur={e => { setFocus(false); props.onBlur?.(e); }}
        style={[{
          backgroundColor: t.input, color: t.text, borderWidth: 1.5, borderColor: error ? t.danger : focus ? t.primary : t.border, borderRadius: R.control,
          paddingHorizontal: 14, paddingVertical: props.multiline ? 12 : 0, minHeight: 50, fontSize: 15.5,
          textAlignVertical: props.multiline ? 'top' : 'center',
        }, style]}
      />
      {error ? <Text style={{ color: t.danger, fontSize: 12.5, marginTop: 5, fontWeight: '600' }}>{error}</Text> : hint ? <Text style={{ color: t.textMuted, fontSize: 12.5, marginTop: 5 }}>{hint}</Text> : null}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder, style }: { value: string; onChangeText: (s: string) => void; placeholder: string; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.card, borderRadius: R.control, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border, paddingHorizontal: 14, height: 48, ...lift(t) }, style]}>
      <Search size={18} color={t.textMuted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={t.textMuted} returnKeyType="search"
        style={{ flex: 1, color: t.text, fontSize: 15, height: 48 }} />
      {value ? <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search"><X size={18} color={t.textMuted} /></Pressable> : null}
    </View>
  );
}

// ---- Choosers --------------------------------------------------------------------------------

/** Horizontally scrolling chips (filters, groups). */
export function Segmented<K extends string>({ options, value, onChange, style }: { options: { key: K; label: string; count?: number }[]; value: K; onChange: (k: K) => void; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0, flexShrink: 0 }, style]} contentContainerStyle={{ paddingHorizontal: S.screen, paddingVertical: 10, gap: 8 }}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 15, borderRadius: R.pill, backgroundColor: on ? t.primary : t.card, borderWidth: 1, borderColor: on ? t.primary : t.border }}>
            <Text style={{ color: on ? t.primaryText : t.text, fontWeight: '700', fontSize: 13.5 }}>{o.label}</Text>
            {o.count ? <Badge count={o.count} inverted={on} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Equal-width segmented control (2–4 choices). */
export function Tabs<K extends string>({ options, value, onChange, style }: { options: { key: K; label: string; badge?: number; icon?: React.ReactNode }[]; value: K; onChange: (k: K) => void; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: t.cardAlt, borderRadius: R.control + 2, padding: 4, gap: 4 }, style]}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, height: 40, borderRadius: R.control, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: on ? t.card : 'transparent', ...(on ? lift(t) : {}) }}>
            {o.icon}
            <Text numberOfLines={1} style={{ color: on ? t.text : t.textSoft, fontWeight: on ? '800' : '700', fontSize: 13.5 }}>{o.label}</Text>
            {o.badge ? <Badge count={o.badge} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress: () => void; icon?: React.ReactNode }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: R.pill, backgroundColor: on ? t.primary : t.card, borderWidth: 1, borderColor: on ? t.primary : t.border }}>
      {icon}
      <Text style={{ color: on ? t.primaryText : t.text, fontWeight: '700', fontSize: 13.5 }}>{label}</Text>
    </Pressable>
  );
}

// ---- Rows ------------------------------------------------------------------------------------

export function ListRow({ onPress, left, title, subtitle, meta, right, unread, last }: {
  onPress?: () => void; left?: React.ReactNode; title: string; subtitle?: string; meta?: string; right?: React.ReactNode; unread?: boolean; last?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: S.screen, paddingVertical: 13,
      backgroundColor: pressed ? t.cardAlt : unread ? t.primarySoft : t.card, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.border,
    })}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: t.text, fontSize: 15, fontWeight: unread ? '800' : '700' }}>{title}</Text>
          {meta ? <Text style={{ color: unread ? t.primary : t.textMuted, fontSize: 12, fontWeight: unread ? '800' : '500' }}>{meta}</Text> : null}
        </View>
        {subtitle ? <Text numberOfLines={2} style={{ color: unread ? t.text : t.textSoft, fontSize: 13, marginTop: 2, lineHeight: 18 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

/** Coloured square with an icon (menus, quick actions). */
export function IconTile({ icon: Icon, color, size = 44, bg }: { icon: any; color: string; size?: number; bg?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg || color + '1F', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={size * 0.5} color={color} />
    </View>
  );
}

export function Avatar({ name, size = 40, color }: { name?: string | null; size?: number; color?: string }) {
  const t = useTheme();
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
  if (color) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{initials}</Text>
      </View>
    );
  }
  const hue = [...(name || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue}, 45%, ${t.dark ? 26 : 90}%)`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: `hsl(${hue}, 55%, ${t.dark ? 82 : 30}%)`, fontWeight: '800', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

// ---- Numbers ---------------------------------------------------------------------------------

export function ProgressBar({ value, color, height = 8, track }: { value: number; color?: string; height?: number; track?: string }) {
  const t = useTheme();
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track || t.cardAlt, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height, borderRadius: height / 2, backgroundColor: color || t.primary }} />
    </View>
  );
}

/** Circular progress with a label in the middle. */
export function Ring({ value, size = 96, stroke = 10, color, track, children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode }) {
  const t = useTheme();
  const v = Math.max(0, Math.min(1, value || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track || t.cardAlt} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color || t.primary} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v)} />
      </Svg>
      {children}
    </View>
  );
}

export function Stat({ value, label, color, align = 'center' }: { value: React.ReactNode; label: string; color?: string; align?: 'center' | 'flex-start' }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: align }}>
      <Text style={{ color: color || t.text, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ color: t.textSoft, fontSize: 12, marginTop: 2, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ---- States ----------------------------------------------------------------------------------

export function Empty({ title, text, icon, action }: { title: string; text?: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 44, paddingHorizontal: 28 }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: t.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
        {icon || <Inbox size={34} color={t.textMuted} />}
      </View>
      <Text style={{ color: t.text, fontWeight: '800', fontSize: 16.5, marginTop: 14, textAlign: 'center' }}>{title}</Text>
      {text ? <Text style={{ color: t.textSoft, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>{text}</Text> : null}
      {action ? <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={t.primary} size="large" />
      {label ? <Text style={{ color: t.textSoft }}>{label}</Text> : null}
    </View>
  );
}

/** Grey placeholder blocks while a list loads. */
export function Skeleton({ rows = 3, height = 72 }: { rows?: number; height?: number }) {
  const t = useTheme();
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: rows }, (_, i) => <View key={i} style={{ height, borderRadius: R.card, backgroundColor: t.cardAlt, opacity: 1 - i * 0.18 }} />)}
    </View>
  );
}

export function ErrorBox({ message, onRetry, style }: { message: string; onRetry?: () => void; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View style={[{ margin: 12, padding: 12, borderRadius: R.control, backgroundColor: t.dangerSoft, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, style]}>
      <CircleAlert size={18} color={t.danger} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.danger, fontWeight: '700', lineHeight: 19 }}>{message}</Text>
        {onRetry ? <Pressable onPress={onRetry} style={{ marginTop: 6 }} hitSlop={8}><Text style={{ color: t.danger, fontWeight: '900' }}>Try again</Text></Pressable> : null}
      </View>
    </View>
  );
}

/** Coloured note (info / success / warning / danger). */
export function Banner({ text, tone = 'primary', icon, onPress, right, style }: { text: string; tone?: Tone; icon?: React.ReactNode; onPress?: () => void; right?: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  const [bg, fg] = toneColors(t, tone);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[{ backgroundColor: bg, borderRadius: R.control, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      {icon}
      <Text style={{ color: fg, flex: 1, fontWeight: '700', lineHeight: 19 }}>{text}</Text>
      {right}
    </Pressable>
  );
}

export function KeyValue({ label, value, last }: { label: string; value?: React.ReactNode; last?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.border, gap: 12 }}>
      <Text style={{ color: t.textSoft, flex: 1, fontSize: 13.5 }}>{label}</Text>
      <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{typeof value === 'string' || typeof value === 'number' || value == null ? <Text selectable style={{ color: t.text, fontSize: 14, fontWeight: '700', textAlign: 'right' }}>{value ?? '—'}</Text> : value}</View>
    </View>
  );
}

// ---- Bottom sheet ----------------------------------------------------------------------------

export function Sheet({ title, onClose, children, footer, scroll = true }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; scroll?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: t.overlay }} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ backgroundColor: t.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <View style={{ alignItems: 'center', paddingTop: 8 }}><View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: t.border }} /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12 }}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '800', flex: 1 }}>{title}</Text>
          <IconButton label="Close" icon={<X size={20} color={t.text} />} onPress={onClose} size={38} />
        </View>
        {scroll ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: footer ? 12 : 20 + insets.bottom }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        ) : <View style={{ paddingHorizontal: 18, paddingBottom: footer ? 12 : 20 + insets.bottom, flexShrink: 1 }}>{children}</View>}
        {footer ? <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14 + insets.bottom, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border, backgroundColor: t.card }}>{footer}</View> : null}
      </View>
    </Modal>
  );
}

/** Centred dialog with a title, text and buttons. */
export function Dialog({ visible, title, text, children, onClose, icon }: { visible: boolean; title: string; text?: string; children?: React.ReactNode; onClose: () => void; icon?: React.ReactNode }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: t.card, borderRadius: 22, padding: 22, ...lift(t, 2) }}>
          {icon ? <View style={{ marginBottom: 12 }}>{icon}</View> : null}
          <Text style={{ color: t.text, fontSize: 19, fontWeight: '900' }}>{title}</Text>
          {text ? <Text style={{ color: t.textSoft, marginTop: 8, lineHeight: 21, fontSize: 14.5 }}>{text}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

// ---- Helpers ---------------------------------------------------------------------------------

export function confirm(title: string, message: string, yes: string, onYes: () => void, destructive = true) {
  // Browser preview (development): Alert has no buttons there
  if (Platform.OS === 'web') { if ((globalThis as any).confirm?.(`${title}\n\n${message}`)) onYes(); return; }
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

export const round2 = (n: number) => Math.round((n || 0) * 100) / 100;
