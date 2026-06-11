import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { apiFetch } from '../../lib/api';

interface ServiceForm {
  name: string;
  durationMin: string;
  priceRub: string;
  bufferMin: string;
}

const DEFAULT_FORM: ServiceForm = { name: '', durationMin: '60', priceRub: '0', bufferMin: '0' };

export default function ServiceFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const nav = useNavigation();

  const [form, setForm] = useState<ServiceForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    nav.setOptions({ title: isNew ? 'Новая услуга' : 'Редактировать' });
    if (!isNew) void loadService();
  }, [id]);

  async function loadService() {
    try {
      const all = await apiFetch<Array<{ id: string; name: string; durationMin: number; priceKopecks: number; bufferMin: number }>>('/services');
      const svc = all.find((s) => s.id === id);
      if (svc) {
        setForm({
          name: svc.name,
          durationMin: String(svc.durationMin),
          priceRub: String(svc.priceKopecks / 100),
          bufferMin: String(svc.bufferMin),
        });
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить услугу');
    } finally {
      setLoading(false);
    }
  }

  function set(key: keyof ServiceForm) {
    return (val: string) => setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    const name = form.name.trim();
    if (!name) { Alert.alert('Укажите название услуги'); return; }
    const durationMin = parseInt(form.durationMin, 10);
    const priceKopecks = Math.round(parseFloat(form.priceRub.replace(',', '.')) * 100);
    const bufferMin = parseInt(form.bufferMin, 10) || 0;
    if (!durationMin || durationMin < 5) { Alert.alert('Длительность минимум 5 минут'); return; }
    if (isNaN(priceKopecks) || priceKopecks < 0) { Alert.alert('Некорректная цена'); return; }

    setSaving(true);
    try {
      if (isNew) {
        await apiFetch('/services', {
          method: 'POST',
          body: JSON.stringify({ name, durationMin, priceKopecks, bufferMin }),
        });
      } else {
        await apiFetch(`/services/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, durationMin, priceKopecks, bufferMin }),
        });
      }
      router.back();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Попробуйте ещё раз');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    Alert.alert('Удалить услугу?', 'Это действие необратимо.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/services/${id}`, { method: 'DELETE' });
            router.back();
          } catch (e) {
            Alert.alert('Ошибка', e instanceof Error ? e.message : 'Попробуйте ещё раз');
          }
        },
      },
    ]);
  }

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Field label="Название" value={form.name} onChangeText={set('name')} placeholder="Стрижка, маникюр..." />
        <Field
          label="Длительность (мин)"
          value={form.durationMin}
          onChangeText={set('durationMin')}
          keyboardType="number-pad"
        />
        <Field
          label="Цена (₽)"
          value={form.priceRub}
          onChangeText={set('priceRub')}
          keyboardType="decimal-pad"
        />
        <Field
          label="Буфер после (мин)"
          value={form.bufferMin}
          onChangeText={set('bufferMin')}
          keyboardType="number-pad"
          hint="Время для подготовки перед следующим клиентом"
        />

        <Pressable style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={() => void save()} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{isNew ? 'Создать' : 'Сохранить'}</Text>
          )}
        </Pressable>

        {!isNew && (
          <Pressable style={styles.deleteBtn} onPress={() => void remove()}>
            <Text style={styles.deleteBtnText}>Удалить услугу</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  placeholder?: string;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
      />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 4 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  saveBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  deleteBtnText: { color: '#EF4444', fontSize: 15 },
});
