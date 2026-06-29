import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from './api';
import { triggerLocalNotification } from './notifications';

const BACKGROUND_FETCH_TASK = 'background-fetch-notices-support';

// Define the background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('[Background Fetch] Running background checks...');
    let newData = false;

    // 1. Fetch notices (bootstrap)
    const bootRes = await ApiClient.bootstrap();
    if (bootRes.success && bootRes.noticesList) {
      const stored = await AsyncStorage.getItem('seen_notices');
      let seenIds: string[] = stored ? JSON.parse(stored) : [];
      
      const newAlerts: any[] = [];
      const updatedSeenIds = [...seenIds];

      for (const notice of bootRes.noticesList) {
        if (!seenIds.includes(notice.id)) {
          newAlerts.push(notice);
          updatedSeenIds.push(notice.id);
        }
      }

      if (newAlerts.length > 0) {
        newData = true;
        await AsyncStorage.setItem('seen_notices', JSON.stringify(updatedSeenIds));
        for (const notice of newAlerts) {
          let notificationTitle = 'New Announcement';
          if (notice.category === 'admit_card') {
            notificationTitle = 'New Admit Card Notice!';
          } else if (notice.category === 'result') {
            notificationTitle = 'New Exam Result Notice!';
          } else if (notice.category === 'notice') {
            notificationTitle = 'New Notice & Alert!';
          }

          await triggerLocalNotification(
            notificationTitle,
            notice.title,
            { type: 'notice', id: notice.id }
          );
        }
      }
    }

    // 2. Fetch support messages if user is logged in
    const savedEmail = await SecureStore.getItemAsync('tb_user_email');
    const savedPassword = await SecureStore.getItemAsync('tb_user_password');
    if (savedEmail && savedPassword) {
      const authRes = await ApiClient.login(savedEmail, savedPassword);
      if (authRes.success && authRes.user) {
        const currentUser = authRes.user;
        const res = await ApiClient.getSupportMessages(currentUser.id, false);
        if (res.success && res.messages) {
          const messagesList = res.messages;
          const storageKey = `seen_messages_${currentUser.id}`;
          const stored = await AsyncStorage.getItem(storageKey);
          let seenIds: string[] = stored ? JSON.parse(stored) : [];

          const newAlerts: any[] = [];
          const updatedSeenIds = [...seenIds];

          for (const msg of messagesList) {
            if (msg.sender === 'ADMIN' && !seenIds.includes(msg.id)) {
              newAlerts.push(msg);
              updatedSeenIds.push(msg.id);
            }
          }

          if (newAlerts.length > 0) {
            newData = true;
            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedSeenIds));
            for (const msg of newAlerts) {
              await triggerLocalNotification(
                'Support Team Response',
                msg.message,
                { type: 'support', id: msg.id }
              );
            }
          }
        }
      }
    }

    return newData 
      ? BackgroundFetch.BackgroundFetchResult.NewData 
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[Background Fetch] Error in task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Function to register background fetch task
export async function registerBackgroundFetchAsync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (default & minimum interval for background fetch)
        stopOnTerminate: false, // Keep running if the user terminated/swiped the app away
        startOnBoot: true, // Run after phone boots
      });
      console.log('[Background Fetch] Registered successfully');
    } else {
      console.log('[Background Fetch] Already registered');
    }
  } catch (err) {
    console.error('[Background Fetch] Registration failed:', err);
  }
}
