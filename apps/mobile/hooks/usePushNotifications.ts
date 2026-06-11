import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiFetch } from '../lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  useEffect(() => {
    void registerPushToken();
  }, []);
}

async function registerPushToken(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      status = requested;
    }
    if (status !== 'granted') return;

    const easExtra = Constants.expoConfig?.extra as
      | { eas?: { projectId?: string } }
      | undefined;
    const projectId = easExtra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    await apiFetch('/devices', {
      method: 'POST',
      body: JSON.stringify({ token: tokenData.data, platform: Platform.OS }),
    });
  } catch (err) {
    console.warn('[usePushNotifications] registration failed:', err);
  }
}
