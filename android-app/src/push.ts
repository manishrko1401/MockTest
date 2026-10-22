import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { request } from './api';

// -----------------------------------------------------------------------------
// Notifications. Android channels are created on first start so each kind can be tuned in
// Android settings. When the app is built with Firebase (google-services.json), this phone's
// FCM token is sent to the server after sign-in, and the server pushes friend requests and
// messages, room invites / joins / starts and support replies (shown even when the app is
// closed). Tapping one opens its screen (App.tsx).
// -----------------------------------------------------------------------------

export const CHANNELS = {
  friends: 'Friend requests & messages',
  rooms: 'Test rooms',
  support: 'Support chat replies',
  notices: 'Job notices & updates',
  results: 'Results & offline uploads',
} as const;

const TOKEN_KEY = 'mth_push_token';
export const firebaseBuilt: boolean = !!(Constants.expoConfig?.extra as any)?.firebase;

/** The chat or room on screen right now ("chat-<friendId>" / "room-<code>"): no banner for it. */
let onScreen: string | null = null;
export const setOnScreen = (tag: string | null) => { onScreen = tag; };
export const tagOf = (data: Record<string, any> | undefined) =>
  data?.screen === 'chat' && data.friendId ? `chat-${data.friendId}` : data?.screen === 'room' && data.code ? `room-${data.code}` : null;

Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const showing = !!onScreen && tagOf(n.request.content.data as any) === onScreen;
    return { shouldShowBanner: !showing, shouldShowList: !showing, shouldPlaySound: !showing, shouldSetBadge: false };
  },
});

export async function setupNotifications(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  for (const [id, name] of Object.entries(CHANNELS)) {
    await Notifications.setNotificationChannelAsync(id, {
      name,
      importance: id === 'notices' || id === 'results' ? Notifications.AndroidImportance.DEFAULT : Notifications.AndroidImportance.HIGH,
      sound: 'default',
      lightColor: '#1e4e79',
    });
  }
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted || !firebaseBuilt) return null;
  try {
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    await AsyncStorage.setItem(TOKEN_KEY, String(token));
    return String(token);
  } catch {
    return null;
  }
}

/** After sign-in (and on each start): tells the server to send this account's pushes to this phone. */
export async function registerPushDevice() {
  const token = await setupNotifications().catch(() => null);
  if (!token) return;
  await request('notif-device', { token, appVersion: Constants.expoConfig?.version || null }).catch(() => {});
}

/** Before signing out: this phone stops getting the account's pushes. */
export async function unregisterPushDevice() {
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (token) await request('notif-device-remove', { token }).catch(() => {});
}

/** A local alert (used when offline results finish uploading). */
export async function notifyLocal(channel: keyof typeof CHANNELS, title: string, body: string) {
  if (Platform.OS !== 'android') return;
  await Notifications.scheduleNotificationAsync({ content: { title, body, sound: 'default' }, trigger: { channelId: channel } }).catch(() => {});
}
