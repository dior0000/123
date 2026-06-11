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
import { router } from 'expo-router';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('+7');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const clean = phone.replace(/\s/g, '');
    if (!/^\+7\d{10}$/.test(clean)) {
      Alert.alert('Ошибка', 'Введите номер в формате +7XXXXXXXXXX');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean }),
      });
      if (!res.ok) throw new Error('Не удалось отправить код');
      router.push({ pathname: '/auth/otp', params: { phone: clean } });
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вход</Text>
      <Text style={styles.label}>Номер телефона</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+7XXXXXXXXXX"
        maxLength={12}
        autoFocus
      />
      <TouchableOpacity style={styles.btn} onPress={handleSend} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Получить код</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 32, textAlign: 'center' },
  label: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginBottom: 24,
    letterSpacing: 1,
  },
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
