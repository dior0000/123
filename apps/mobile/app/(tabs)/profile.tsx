import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../../lib/api';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../auth/otp';

interface SubscriptionInfo {
  plan: string;
  status: string;
  expiresAt: string | null;
}

interface QuotaInfo {
  allowed: boolean;
  remaining: number | null;
}

export default function ProfileScreen() {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, []),
  );

  async function load() {
    setLoading(true);
    try {
      const [s, q] = await Promise.all([
        apiFetch<SubscriptionInfo>('/subscription'),
        apiFetch<QuotaInfo>('/subscription/quota'),
      ]);
      setSub(s);
      setQuota(q);
    } catch {
      // ignore — show defaults
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      const rt = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) }).catch(() => {});
    } finally {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
      router.replace('/auth/phone');
    }
  }

  function confirmLogout() {
    Alert.alert('Выйти из аккаунта', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      'Удалить аккаунт',
      'Все ваши данные будут безвозвратно удалены. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => void deleteAccount(),
        },
      ],
    );
  }

  async function deleteAccount() {
    try {
      await apiFetch('/auth/account', { method: 'DELETE' });
    } catch {
      Alert.alert('Ошибка', 'Не удалось удалить аккаунт. Попробуйте позже.');
      return;
    }
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    router.replace('/auth/phone');
  }

  const isPro = sub?.plan !== 'free' && sub?.status === 'active';
  const planLabel = isPro
    ? sub?.plan === 'pro_yearly'
      ? 'Pro (годовой)'
      : 'Pro (месячный)'
    : 'Бесплатный';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Профиль</Text>

      {loading ? (
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 32 }} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Тариф</Text>
          <Text style={[styles.planBadge, isPro && styles.planBadgePro]}>{planLabel}</Text>

          {!isPro && quota && (
            <View style={styles.quotaRow}>
              <Text style={styles.quotaText}>
                Записей в этом месяце:{' '}
                {quota.remaining !== null ? `осталось ${quota.remaining} из 30` : '—'}
              </Text>
              {quota.remaining === 0 && (
                <Text style={styles.quotaWarn}>Лимит исчерпан</Text>
              )}
            </View>
          )}

          {isPro && sub?.expiresAt && (
            <Text style={styles.expires}>
              Действует до {new Date(sub.expiresAt).toLocaleDateString('ru-RU')}
            </Text>
          )}

          {!isPro && (
            <Pressable style={styles.proBtn} onPress={() => router.push('/paywall')}>
              <Text style={styles.proBtnText}>Перейти на Pro →</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>Настройки</Text>
        <Pressable style={styles.settingsRow} onPress={() => router.push('/services')}>
          <Text style={styles.settingsRowText}>Услуги</Text>
          <Text style={styles.settingsArrow}>›</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.settingsRow} onPress={() => router.push('/working-hours')}>
          <Text style={styles.settingsRowText}>Расписание работы</Text>
          <Text style={styles.settingsArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.logoutBtn} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </Pressable>

        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteText}>Удалить аккаунт</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#F9FAFB' },
  title: { fontSize: 24, fontWeight: '700', marginTop: 12, marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLabel: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  planBadge: { fontSize: 18, fontWeight: '700', color: '#374151' },
  planBadgePro: { color: '#7C3AED' },
  quotaRow: { marginTop: 12 },
  quotaText: { fontSize: 14, color: '#6B7280' },
  quotaWarn: { fontSize: 13, color: '#EF4444', marginTop: 4, fontWeight: '600' },
  expires: { fontSize: 13, color: '#9CA3AF', marginTop: 8 },
  proBtn: {
    marginTop: 20,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  proBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  settingsTitle: { fontSize: 13, color: '#6B7280', paddingVertical: 10 },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  settingsRowText: { fontSize: 16, color: '#111827' },
  settingsArrow: { fontSize: 20, color: '#9CA3AF' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  actions: { marginTop: 24, gap: 12 },
  logoutBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logoutText: { color: '#374151', fontSize: 15 },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
});
