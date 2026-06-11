import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001';
export const ACCESS_TOKEN_KEY = 'pb_access_token';
export const REFRESH_TOKEN_KEY = 'pb_refresh_token';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Ошибка', 'Введите 6-значный код');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? 'Неверный код');
      }
      const { accessToken, refreshToken } = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Введите код</Text>
      <Text style={styles.subtitle}>Отправили SMS на {phone}</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="------"
        textAlign="center"
        autoFocus
      />
      <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Войти</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>Изменить номер</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 32, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    marginBottom: 24,
    letterSpacing: 8,
  },
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  back: { alignItems: 'center', padding: 8 },
  backText: { color: '#6366f1', fontSize: 15 },
});
