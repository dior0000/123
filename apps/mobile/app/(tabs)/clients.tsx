import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { apiFetch } from '../../lib/api';

interface Client {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  _count: { appointments: number };
}

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q ? `/clients?search=${encodeURIComponent(q)}` : '/clients';
      const data = await apiFetch<Client[]>(url);
      setClients(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleSearch = (text: string) => {
    setSearch(text);
    void load(text.trim() || undefined);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Клиенты</Text>

      <TextInput
        style={styles.search}
        placeholder="Поиск по имени или телефону"
        value={search}
        onChangeText={handleSearch}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {loading && clients.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
      ) : clients.length === 0 ? (
        <Text style={styles.empty}>Клиентов пока нет</Text>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/clients/${item.id}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.phone}>{item.phone}</Text>
              </View>
              <Text style={styles.count}>{item._count.appointments} записей</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 56 },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  search: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ede9fe',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#6366f1' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  phone: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  count: { fontSize: 13, color: '#9ca3af' },
  sep: { height: 1, backgroundColor: '#f3f4f6' },
});
