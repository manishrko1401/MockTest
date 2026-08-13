import { Platform } from 'react-native';

// Set to true to enable all device notifications
const ENABLE_NOTIFICATIONS = true;

let Notifications: any = null;

if (ENABLE_NOTIFICATIONS) {
  try {
    // @ts-ignore
    Notifications = require('expo-notifications');

    // Configure notification behavior for when the app is in the foreground
    if (Notifications && Notifications.setNotificationHandler) {
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
  } catch (err: any) {
    console.log('[Notifications] expo-notifications load notice (Expo Go compatibility):', err?.message || err);
    Notifications = null;
  }
}

/**
 * Helper: Safely parses date string (DD/MM/YYYY, YYYY-MM-DD, or text) into JS Date
 */
export function parseLastDate(lastDateStr: string): Date | null {
  if (!lastDateStr || typeof lastDateStr !== 'string') return null;
  const clean = lastDateStr.trim();
  
  // Format DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    return new Date(year, month, day);
  }

  // Format YYYY-MM-DD
  const yyyymmdd = clean.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10) - 1;
    const day = parseInt(yyyymmdd[3], 10);
    return new Date(year, month, day);
  }

  // Standard Date fallback
  const fallback = new Date(clean);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

/**
 * Requests permissions for showing notifications and sets up Android channels.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!ENABLE_NOTIFICATIONS || !Notifications) {
    console.log('[Notifications] Notifications disabled or not available');
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
  if (!ENABLE_NOTIFICATIONS || !Notifications) {
    console.log('[Notifications] Trigger skipped:', title);
    return;
  }
  try {
    await requestNotificationPermissions();
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

/**
 * Schedules deadline reminders for a saved job on 1-day-before and last-day morning.
 */
export async function scheduleJobDeadlineReminders(
  noticeId: string,
  title: string,
  lastDateStr: string
): Promise<void> {
  if (!ENABLE_NOTIFICATIONS || !Notifications || !lastDateStr) return;

  const targetDate = parseLastDate(lastDateStr);
  if (!targetDate) return;

  try {
    await requestNotificationPermissions();

    const now = new Date();

    // 1. Two Days Before Last Date at 9:00 AM
    const twoDaysBefore = new Date(targetDate);
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
    twoDaysBefore.setHours(9, 0, 0, 0);

    if (twoDaysBefore > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Application Closing in 2 Days!',
          body: `Only 2 days left to apply for "${title}". Last date is ${lastDateStr}. Tap to open portal.`,
          data: { noticeId, type: 'job_deadline_reminder' },
          sound: true,
        },
        trigger: { date: twoDaysBefore },
      });
    }

    // 2. Day of Last Date at 8:00 AM
    const lastDayMorning = new Date(targetDate);
    lastDayMorning.setHours(8, 0, 0, 0);

    if (lastDayMorning > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 URGENT: Last Day to Apply Today!',
          body: `Today is the final day to submit your application for "${title}". Tap now to apply!`,
          data: { noticeId, type: 'job_deadline_urgent' },
          sound: true,
        },
        trigger: { date: lastDayMorning },
      });
    }
  } catch (err) {
    console.error('Error scheduling job deadline reminders:', err);
  }
}

/**
 * Checks all saved-but-not-applied jobs and triggers immediate alert if lastDate is today, tomorrow, or in 2 days.
 */
export async function checkAndAlertSavedJobsDeadlines(trackedJobs: any[]): Promise<void> {
  if (!trackedJobs || !Array.isArray(trackedJobs) || trackedJobs.length === 0) return;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const job of trackedJobs) {
    if (job.isSaved && !job.isApplied && job.lastDate) {
      const lastDate = parseLastDate(job.lastDate);
      if (!lastDate) continue;

      lastDate.setHours(0, 0, 0, 0);
      const diffMs = lastDate.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Today is last date!
        await triggerLocalNotification(
          '🚨 URGENT: Today is Last Date to Apply!',
          `Don't forget to submit your form for "${job.title}". Last date is today (${job.lastDate})!`,
          { noticeId: job.noticeId, type: 'job_deadline_today' }
        );
      } else if (diffDays === 1) {
        // Tomorrow is last date!
        await triggerLocalNotification(
          '⏰ Reminder: Application Closing Tomorrow!',
          `Last 24 hours left to apply for "${job.title}". Last Date: ${job.lastDate}.`,
          { noticeId: job.noticeId, type: 'job_deadline_tomorrow' }
        );
      } else if (diffDays === 2) {
        // 2 days left!
        await triggerLocalNotification(
          '⏰ Reminder: Application Closing in 2 Days!',
          `Only 2 days left to apply for "${job.title}". Last Date: ${job.lastDate}.`,
          { noticeId: job.noticeId, type: 'job_deadline_2days' }
        );
      }
    }
  }
}

/**
 * Registers a listener that triggers when a user taps on a notification.
 * Returns an unsubscribe function.
 */
export function addNotificationResponseListener(
  onResponse: (data: any) => void
): () => void {
  if (!ENABLE_NOTIFICATIONS || !Notifications) {
    return () => {};
  }
  
  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data;
      onResponse(data);
    });
    
    return () => {
      subscription.remove();
    };
  } catch (err) {
    console.error('Error registering notification response listener:', err);
    return () => {};
  }
}
