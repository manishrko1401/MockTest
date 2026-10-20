import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// -----------------------------------------------------------------------------
// Notifications. Android channels are created on first start so each kind can be tuned in
// Android settings. When the app is built with Firebase (google-services.json), this phone's
// FCM token is kept so the server can send pushes (new notices, support replies, results).
// -----------------------------------------------------------------------------

export const CHANNELS = {
  notices: 'Job notices & updates',
  support: 'Support chat replies',
  results: 'Results & offline uploads',
} as const;

const TOKEN_KEY = 'mth_push_token';
export const firebaseBuilt: boolean = !!(Constants.expoConfig?.extra as any)?.firebase;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function setupNotifications(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  for (const [id, name] of Object.entries(CHANNELS)) {
    await Notifications.setNotificationChannelAsync(id, {
      name,
      importance: id === 'notices' ? Notifications.AndroidImportance.DEFAULT : Notifications.AndroidImportance.HIGH,
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

/** A local alert (used when offline results finish uploading). */
export async function notifyLocal(channel: keyof typeof CHANNELS, title: string, body: string) {
  if (Platform.OS !== 'android') return;
  await Notifications.scheduleNotificationAsync({ content: { title, body, sound: 'default' }, trigger: { channelId: channel } }).catch(() => {});
}
