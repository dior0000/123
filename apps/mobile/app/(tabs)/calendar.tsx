import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { apiFetch } from '../../lib/api';

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  client: { name: string; phone: string };
  service: { name: string; durationMin: number; priceKopecks: number };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
  completed: 'Завершена',
  no_show: 'Не явился',
};

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const dateStr = selectedDate.toISOString().split('T')[0]!;

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Appointment[]>(`/appointments?date=${dateStr}`);
      setAppointments(data);
    } catch {
      // silently fail — user sees empty list
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useFocusEffect(
    useCallback(() => {
      void loadAppointments();
    }, [loadAppointments]),
  );

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadAppointments();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Попробуйте ещё раз');
    }
  };

  return (
    <View style={styles.container}>
      {/* Date navigation — tap 1 counts here */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => shiftDay(-1)} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{formatDateLabel(selectedDate)}</Text>
        <TouchableOpacity onPress={() => shiftDay(1)} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#6366f1" />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(a) => a.id}
          contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <Text style={styles.empty}>Нет записей на этот день</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTime}>
                <Text style={styles.time}>{formatTime(item.startsAt)}</Text>
                <Text style={styles.timeSep}>—</Text>
                <Text style={styles.time}>{formatTime(item.endsAt)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.clientName}>{item.client.name}</Text>
                <Text style={styles.serviceName}>{item.service.name}</Text>
                <Text style={styles.status}>{STATUS_LABELS[item.status] ?? item.status}</Text>
              </View>
              {item.status === 'pending' && (
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => changeStatus(item.id, 'confirmed')}
                >
                  <Text style={styles.confirmText}>✓</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {/* Tap 1: "+" opens new appointment flow */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push({ pathname: '/appointment/new', params: { date: dateStr } })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 28, color: '#6366f1' },
  dateLabel: { fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', textTransform: 'capitalize' },
  loader: { marginTop: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { fontSize: 16, color: '#9ca3af', textAlign: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTime: { alignItems: 'center', marginRight: 14, minWidth: 48 },
  time: { fontSize: 14, fontWeight: '600', color: '#374151' },
  timeSep: { fontSize: 11, color: '#9ca3af' },
  cardInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  serviceName: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  status: { fontSize: 12, color: '#6366f1', marginTop: 3 },
  confirmBtn: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    padding: 10,
    marginLeft: 8,
  },
  confirmText: { fontSize: 18, color: '#059669' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#6366f1',
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 32 },
});
