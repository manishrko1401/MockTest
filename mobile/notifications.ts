import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set to false to temporarily disable all notifications (e.g. for Expo Go testing)
// Set to true to resume notifications later
const ENABLE_NOTIFICATIONS = false;

if (ENABLE_NOTIFICATIONS) {
  // Configure notification behavior for when the app is in the foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Requests permissions for showing notifications and sets up Android channels.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!ENABLE_NOTIFICATIONS) {
    console.log('[Notifications] Permission request skipped (disabled for Expo Go)');
    return false;
  }
  if (Platform.OS === 'web') return false;
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get notification permissions!');
      return false;
    }
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Triggers an immediate local notification with title, body and custom data payload.
 */
export async function triggerLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> {
  if (!ENABLE_NOTIFICATIONS) {
    console.log('[Notifications] Trigger skipped (disabled for Expo Go):', title);
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // null means trigger immediately
    });
  } catch (error) {
    console.error('Error triggering local notification:', error);
  }
}

