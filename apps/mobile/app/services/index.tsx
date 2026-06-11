import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { apiFetch } from '../../lib/api';

interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceKopecks: number;
  bufferMin: number;
  isActive: boolean;
}

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, []),
  );

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<Service[]>('/services');
      setServices(data);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить услуги');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(svc: Service) {
    try {
      await apiFetch(`/services/${svc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !svc.isActive }),
      });
      await load();
    } catch {
      Alert.alert('Ошибка', 'Не удалось обновить услугу');
    }
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(s) => s.id}
          contentContainerStyle={services.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Услуг пока нет</Text>
              <Text style={styles.emptySubtitle}>Добавьте первую услугу</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, !item.isActive && styles.cardInactive]}
              onPress={() => router.push(`/services/${item.id}`)}
            >
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, !item.isActive && styles.textMuted]}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.durationMin} мин · {(item.priceKopecks / 100).toLocaleString('ru-RU')} ₽
                  {item.bufferMin > 0 ? ` · +${item.bufferMin} мин буфер` : ''}
                </Text>
              </View>
              <Pressable
                style={[styles.toggle, item.isActive && styles.toggleActive]}
                onPress={() => void toggleActive(item)}
                hitSlop={12}
              >
                <Text style={styles.toggleText}>{item.isActive ? 'вкл' : 'выкл'}</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/services/new')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 6 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardInactive: { opacity: 0.55 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardMeta: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  textMuted: { color: '#9CA3AF' },
  toggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  toggleActive: { backgroundColor: '#EDE9FE' },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
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
