import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { apiFetch } from '../../lib/api';

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  client: { name: string; phone: string };
  service: { name: string; priceKopecks: number };
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#10B981',
  cancelled: '#EF4444',
  completed: '#6B7280',
  no_show: '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
  completed: 'Завершена',
  no_show: 'Не явился',
};

function todayStr() {
  return new Date().toISOString().split('T')[0]!;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function todayLabel() {
  return new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function TodayScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, []),
  );

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<Appointment[]>(`/appointments?date=${todayStr()}`);
      setAppointments(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const active = appointments.filter((a) => !['cancelled', 'no_show'].includes(a.status));
  const revenue = active
    .filter((a) => a.status === 'completed')
    .reduce((sum, a) => sum + a.service.priceKopecks, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerDate}>{todayLabel()}</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{active.length}</Text>
            <Text style={styles.statLabel}>записей</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{(revenue / 100).toLocaleString('ru-RU')} ₽</Text>
            <Text style={styles.statLabel}>выручка</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(a) => a.id}
          contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Записей на сегодня нет</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/appointment/${item.id}`)}>
              <View style={styles.timeCol}>
                <Text style={styles.time}>{formatTime(item.startsAt)}</Text>
                <Text style={styles.timeEnd}>{formatTime(item.endsAt)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.clientName}>{item.client.name}</Text>
                <Text style={styles.serviceName}>{item.service.name}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>
                <Text style={styles.statusText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push({ pathname: '/appointment/new', params: { date: todayStr() } })}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#6366f1',
    padding: 20,
    paddingBottom: 24,
  },
  headerDate: {
    color: '#C7D2FE',
    fontSize: 13,
    textTransform: 'capitalize',
    marginBottom: 12,
  },
  stats: { flexDirection: 'row', gap: 32 },
  stat: {},
  statNum: { color: '#fff', fontSize: 26, fontWeight: '700' },
  statLabel: { color: '#C7D2FE', fontSize: 12, marginTop: 2 },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { fontSize: 16, color: '#9CA3AF', textAlign: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  timeCol: { minWidth: 52, marginRight: 14 },
  time: { fontSize: 15, fontWeight: '700', color: '#111827' },
  timeEnd: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  info: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  serviceName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusDot: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
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
