import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { apiFetch } from '../../lib/api';

interface AppointmentDetail {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  source: string;
  client: { id: string; name: string; phone: string };
  service: { id: string; name: string; durationMin: number; priceKopecks: number };
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
  completed: 'Завершена',
  no_show: 'Не явился',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  cancelled: '#ef4444',
  completed: '#6366f1',
  no_show: '#9ca3af',
};

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [appt, setAppt] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAppt();
  }, [id]);

  const loadAppt = async () => {
    try {
      const data = await apiFetch<AppointmentDetail>(`/appointments/${id}`);
      setAppt(data);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить запись');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      await apiFetch(`/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setAppt((prev) => (prev ? { ...prev, status } : prev));
    } catch {
      Alert.alert('Ошибка', 'Не удалось обновить статус');
    }
  };

  const confirmAppointment = () => {
    Alert.alert('Подтвердить запись?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Подтвердить', onPress: () => void updateStatus('confirmed') },
    ]);
  };

  const cancelAppointment = () => {
    Alert.alert('Отменить запись?', 'Клиент получит уведомление', [
      { text: 'Нет', style: 'cancel' },
      { text: 'Отменить запись', style: 'destructive', onPress: () => void updateStatus('cancelled') },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!appt) return null;

  const date = new Date(appt.startsAt);
  const dateStr = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <View style={styles.statusBadge}>
        <Text style={[styles.statusText, { color: STATUS_COLORS[appt.status] ?? '#888' }]}>
          {STATUS_LABELS[appt.status] ?? appt.status}
        </Text>
      </View>

      <Text style={styles.serviceName}>{appt.service.name}</Text>
      <Text style={styles.dateTime}>{dateStr} в {timeStr}</Text>
      <Text style={styles.duration}>{appt.service.durationMin} мин · {(appt.service.priceKopecks / 100).toLocaleString('ru-RU')} ₽</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Клиент</Text>
        <Text style={styles.value}>{appt.client.name}</Text>
        <Text style={styles.subValue}>{appt.client.phone}</Text>
      </View>

      {appt.notes ? (
        <View style={styles.card}>
          <Text style={styles.label}>Заметка</Text>
          <Text style={styles.value}>{appt.notes}</Text>
        </View>
      ) : null}

      {appt.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnConfirm} onPress={confirmAppointment}>
            <Text style={styles.btnConfirmText}>Подтвердить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnCancel} onPress={cancelAppointment}>
            <Text style={styles.btnCancelText}>Отменить</Text>
          </TouchableOpacity>
        </View>
      )}

      {appt.status === 'confirmed' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnConfirm}
            onPress={() => void updateStatus('completed')}
          >
            <Text style={styles.btnConfirmText}>Завершить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnCancel} onPress={cancelAppointment}>
            <Text style={styles.btnCancelText}>Отменить</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Назад</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusBadge: { alignSelf: 'flex-start', marginBottom: 12 },
  statusText: { fontSize: 14, fontWeight: '600' },
  serviceName: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  dateTime: { fontSize: 16, color: '#374151', marginBottom: 4 },
  duration: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  label: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginBottom: 4, letterSpacing: 0.5 },
  value: { fontSize: 16, fontWeight: '600', color: '#111827' },
  subValue: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  actions: { gap: 10, marginTop: 8 },
  btnConfirm: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnCancel: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  btnCancelText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  back: { marginTop: 24, alignItems: 'center' },
  backText: { color: '#6366f1', fontSize: 15, fontWeight: '500' },
});
