import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { Platform, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import Purchases from 'react-native-purchases';
import { PostHog, PostHogProvider } from 'posthog-react-native';
import { ACCESS_TOKEN_KEY } from './auth/otp';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { ONBOARDED_KEY } from './onboarding';

if (process.env['EXPO_PUBLIC_SENTRY_DSN']) {
  Sentry.init({
    dsn: process.env['EXPO_PUBLIC_SENTRY_DSN'],
    tracesSampleRate: 0.1,
  });
}

const posthogClient =
  process.env['EXPO_PUBLIC_POSTHOG_KEY']
    ? new PostHog(process.env['EXPO_PUBLIC_POSTHOG_KEY'], {
        host: 'https://app.posthog.com',
      })
    : null;

function getUserIdFromJwt(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part)) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

function RootLayout() {
  const [checking, setChecking] = useState(true);

  usePushNotifications();

  useEffect(() => {
    void checkAuth();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        screen?: string;
        id?: string;
      };
      if (data.screen === 'appointment' && data.id) {
        router.push(`/appointment/${data.id}`);
      }
    });
    return () => sub.remove();
  }, []);

  const checkAuth = async () => {
    try {
      const [token, onboarded] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(ONBOARDED_KEY),
      ]);

      if (!onboarded) {
        router.replace('/onboarding');
      } else if (!token) {
        router.replace('/auth/phone');
      } else {
        void initRevenueCat(token);
      }
    } catch {
      router.replace('/auth/phone');
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="appointment" options={{ headerShown: false }} />
        <Stack.Screen name="clients" options={{ headerShown: false }} />
        <Stack.Screen name="services" options={{ headerShown: false }} />
        <Stack.Screen name="working-hours" options={{ title: 'Расписание работы' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', title: 'Pro-подписка' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

async function initRevenueCat(token: string) {
  const apiKey =
    Platform.select({
      ios: process.env['EXPO_PUBLIC_RC_API_KEY_IOS'],
      android: process.env['EXPO_PUBLIC_RC_API_KEY_ANDROID'],
    }) ?? '';

  if (!apiKey) return;

  try {
    Purchases.configure({ apiKey });
    const userId = getUserIdFromJwt(token);
    if (userId) {
      await Purchases.logIn(userId);
    }
  } catch (err) {
    console.warn('[RevenueCat] init failed:', err);
  }
}

export default posthogClient
  ? Sentry.wrap(function WrappedRoot() {
      return (
        <PostHogProvider client={posthogClient}>
          <RootLayout />
        </PostHogProvider>
      );
    })
  : Sentry.wrap(RootLayout);
