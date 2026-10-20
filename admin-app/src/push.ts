import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

// -----------------------------------------------------------------------------
// Alerts on the phone.
//  - App closed / in the background: Firebase Cloud Messaging pushes from the server, shown
//    by Android on the channel for that kind of message.
//  - App open: new items found by the live sync (see live.tsx) are shown as local alerts on
//    the same channels, so they look and sound the same.
// Each kind has its own Android channel, so sound / vibration / priority can be changed per
// kind in Android settings, and kinds can be muted for this phone in the app's Settings.
// -----------------------------------------------------------------------------

export type AlertType = 'support' | 'report' | 'inquiry' | 'suggestion' | 'feedback';
export const ALERT_LABELS: Record<AlertType, string> = {
  support: 'Support chat messages',
  report: 'Reported questions',
  inquiry: 'Contact inquiries',
  suggestion: 'Suggestions',
  feedback: 'Feedback & ratings',
};
export const CHANNEL: Record<AlertType, string> = {
  support: 'support_chat', report: 'reported_questions', inquiry: 'inquiries', suggestion: 'suggestions', feedback: 'feedback',
};

const MUTED_KEY = 'mth_admin_muted';
const TOKEN_KEY = 'mth_admin_push_token';
export const firebaseBuilt: boolean = !!(Constants.expoConfig?.extra as any)?.firebase;

export async function setupChannels() {
  if (Platform.OS !== 'android') return;
  for (const type of Object.keys(CHANNEL) as AlertType[]) {
    await Notifications.setNotificationChannelAsync(CHANNEL[type], {
      name: ALERT_LABELS[type],
      importance: type === 'feedback' ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#1e4e79',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      showBadge: true,
      enableVibrate: true,
    });
  }
}

export async function getMuted(): Promise<AlertType[]> {
  try { return JSON.parse((await AsyncStorage.getItem(MUTED_KEY)) || '[]'); } catch { return []; }
}
export async function setMuted(muted: AlertType[]) {
  await AsyncStorage.setItem(MUTED_KEY, JSON.stringify(muted));
  await registerForPush().catch(() => {});
}

export type PushStatus = 'ok' | 'no-permission' | 'no-firebase' | 'error';

/** Asks for permission, gets this phone's FCM token and gives it to the server. */
export async function registerForPush(): Promise<{ status: PushStatus; serverConfigured?: boolean; error?: string }> {
  if (Platform.OS !== 'android') return { status: 'no-firebase' };
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return { status: 'no-permission' };
  if (!firebaseBuilt) return { status: 'no-firebase' };
  try {
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    const deviceName = `${(Platform.constants as any)?.Brand || ''} ${(Platform.constants as any)?.Model || ''}`.trim() || 'Android phone';
    const res = await api<{ configured: boolean }>('register-push', { token, deviceName, muted: await getMuted() });
    await AsyncStorage.setItem(TOKEN_KEY, String(token));
    return { status: 'ok', serverConfigured: res.configured };
  } catch (e: any) {
    return { status: 'error', error: e?.message || String(e) };
  }
}

export const getSavedPushToken = () => AsyncStorage.getItem(TOKEN_KEY);
export const forgetPushToken = () => AsyncStorage.removeItem(TOKEN_KEY);

/** Shows an alert while the app is open (same channel as the push for that kind). */
export async function showLocalAlert(type: AlertType, title: string, body: string, data: Record<string, string>) {
  if (Platform.OS !== 'android' || (await getMuted()).includes(type)) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { ...data, type, local: '1' }, sound: 'default', priority: Notifications.AndroidNotificationPriority.MAX },
    trigger: { channelId: CHANNEL[type] },
  });
}
