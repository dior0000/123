/**
 * New Appointment screen — ≤4 taps from Calendar:
 * Tap 1: "+" on calendar → this screen (date pre-filled)
 * Tap 2: select service
 * Tap 3: select time slot
 * Tap 4: "Создать" (after entering client phone/name)
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../../lib/api';

interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceKopecks: number;
}

interface SlotDto {
  startsAt: string;
  endsAt: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatPrice(kopecks: number) {
  return `${(kopecks / 100).toFixed(0)} ₽`;
}

export default function NewAppointmentScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [clientPhone, setClientPhone] = useState('+7');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    apiFetch<Service[]>('/services')
      .then((data) => setServices(data.filter((s) => (s as Service & { isActive: boolean }).isActive !== false)))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!selectedService || !date) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    apiFetch<SlotDto[]>(`/appointments/slots?serviceId=${selectedService.id}&date=${date}`)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedService, date]);

  const handleCreate = async () => {
    if (!selectedService) return Alert.alert('', 'Выберите услугу');
    if (!selectedSlot) return Alert.alert('', 'Выберите время');
    if (!/^\+7\d{10}$/.test(clientPhone)) return Alert.alert('', 'Введите номер +7XXXXXXXXXX');
    if (!clientName.trim()) return Alert.alert('', 'Введите имя клиента');

    setLoading(true);
    try {
      await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: selectedService.id,
          clientPhone,
          clientName: clientName.trim(),
          startsAt: selectedSlot.startsAt,
          consentGiven: false,
        }),
      });
      Alert.alert('Готово', 'Запись создана', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Новая запись</Text>
      <Text style={styles.dateLabel}>{date}</Text>

      {/* Step 1 (Tap 2): Select service */}
      <Text style={styles.sectionLabel}>Услуга</Text>
      <View style={styles.chipRow}>
        {services.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.chip, selectedService?.id === s.id && styles.chipSelected]}
            onPress={() => setSelectedService(s)}
          >
            <Text style={[styles.chipText, selectedService?.id === s.id && styles.chipTextSelected]}>
              {s.name}
            </Text>
            <Text style={[styles.chipSub, selectedService?.id === s.id && styles.chipTextSelected]}>
              {s.durationMin} мин · {formatPrice(s.priceKopecks)}
            </Text>
          </TouchableOpacity>
        ))}
        {services.length === 0 && (
          <Text style={styles.hint}>Добавьте услуги в разделе «Профиль»</Text>
        )}
      </View>

      {/* Step 2 (Tap 3): Select slot */}
      {selectedService && (
        <>
          <Text style={styles.sectionLabel}>Время</Text>
          {slotsLoading ? (
            <ActivityIndicator color="#6366f1" />
          ) : slots.length === 0 ? (
            <Text style={styles.hint}>Нет свободных слотов на этот день</Text>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((slot) => (
                <TouchableOpacity
                  key={slot.startsAt}
                  style={[styles.slotBtn, selectedSlot?.startsAt === slot.startsAt && styles.slotBtnSelected]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text style={[styles.slotText, selectedSlot?.startsAt === slot.startsAt && styles.slotTextSelected]}>
                    {formatTime(slot.startsAt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {/* Client info */}
      {selectedSlot && (
        <>
          <Text style={styles.sectionLabel}>Клиент</Text>
          <TextInput
            style={styles.input}
            value={clientPhone}
            onChangeText={setClientPhone}
            placeholder="+7XXXXXXXXXX"
            keyboardType="phone-pad"
            maxLength={12}
          />
          <TextInput
            style={styles.input}
            value={clientName}
            onChangeText={setClientName}
            placeholder="Имя клиента"
            maxLength={100}
          />
        </>
      )}

      {/* Tap 4: Confirm */}
      <TouchableOpacity
        style={[styles.createBtn, (!selectedSlot || loading) && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={!selectedSlot || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createText}>Создать запись</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  dateLabel: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 10,
    minWidth: 120,
  },
  chipSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  chipSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  chipTextSelected: { color: '#6366f1' },
  hint: { fontSize: 14, color: '#9ca3af', fontStyle: 'italic' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  slotBtnSelected: { borderColor: '#6366f1', backgroundColor: '#6366f1' },
  slotText: { fontSize: 15, fontWeight: '500', color: '#374151' },
  slotTextSelected: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  createBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  createBtnDisabled: { backgroundColor: '#c7d2fe' },
  createText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
