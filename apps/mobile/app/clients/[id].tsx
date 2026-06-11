import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  Alert, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { apiFetch } from '../../lib/api';

interface ClientDetail {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  tags: string[];
  consentGiven: boolean;
  isSubscribed: boolean;
  appointments: Array<{
    id: string;
    startsAt: string;
    status: string;
    service: { name: string; priceKopecks: number };
  }>;
}

const STATUS_RU: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
  completed: 'Завершена',
  no_show: 'Не явился',
};

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, [id]);

  const load = async () => {
    try {
      const data = await apiFetch<ClientDetail>(`/clients/${id}`);
      setClient(data);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить клиента');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!client) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{client.name[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View>
          <Text style={styles.name}>{client.name}</Text>
          <Text style={styles.phone}>{client.phone}</Text>
        </View>
      </View>

      {client.tags.length > 0 && (
        <View style={styles.tags}>
          {client.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.meta}>
        <Text style={styles.metaItem}>
          {client.consentGiven ? '✅ Согласие получено' : '⚠️ Нет согласия'}
        </Text>
        <Text style={styles.metaItem}>
          {client.isSubscribed ? '📩 Подписан на рассылки' : '🔕 Отписан'}
        </Text>
      </View>

      {client.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Заметка</Text>
          <Text style={styles.notes}>{client.notes}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>История записей ({client.appointments.length})</Text>
        {client.appointments.map((appt) => (
          <TouchableOpacity
            key={appt.id}
            style={styles.apptRow}
            onPress={() => router.push(`/appointment/${appt.id}`)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.apptService}>{appt.service.name}</Text>
              <Text style={styles.apptDate}>
                {new Date(appt.startsAt).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
            <View>
              <Text style={styles.apptPrice}>
                {(appt.service.priceKopecks / 100).toLocaleString('ru-RU')} ₽
              </Text>
              <Text style={styles.apptStatus}>{STATUS_RU[appt.status] ?? appt.status}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#6366f1' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  phone: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { backgroundColor: '#ede9fe', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: '#6366f1', fontSize: 13, fontWeight: '500' },
  meta: { marginBottom: 16, gap: 4 },
  metaItem: { fontSize: 14, color: '#374151' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  notes: { fontSize: 15, color: '#374151', lineHeight: 22 },
  apptRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  apptService: { fontSize: 15, fontWeight: '600', color: '#111827' },
  apptDate: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  apptPrice: { fontSize: 14, fontWeight: '700', color: '#6366f1', textAlign: 'right' },
  apptStatus: { fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: 2 },
});
