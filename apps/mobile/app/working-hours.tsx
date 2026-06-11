import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiFetch } from '../lib/api';

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAYS_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

interface DayState {
  enabled: boolean;
  startTime: string;
  endTime: string;
  saving: boolean;
}

const DEFAULT_DAY: Omit<DayState, 'saving'> = { enabled: false, startTime: '09:00', endTime: '18:00' };

export default function WorkingHoursScreen() {
  const [days, setDays] = useState<DayState[]>(
    Array.from({ length: 7 }, () => ({ ...DEFAULT_DAY, saving: false })),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const data = await apiFetch<Array<{ dayOfWeek: number; startTime: string; endTime: string }>>('/working-hours');
      setDays((prev) =>
        prev.map((d, i) => {
          const entry = data.find((wh) => wh.dayOfWeek === i);
          if (entry) return { enabled: true, startTime: entry.startTime, endTime: entry.endTime, saving: false };
          return { ...d, saving: false };
        }),
      );
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить расписание');
    } finally {
      setLoading(false);
    }
  }

  function setDay(index: number, patch: Partial<DayState>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function toggleDay(index: number, enabled: boolean) {
    setDay(index, { enabled, saving: true });
    try {
      if (enabled) {
        const d = days[index]!;
        await apiFetch(`/working-hours/${index}`, {
          method: 'PUT',
          body: JSON.stringify({ startTime: d.startTime, endTime: d.endTime }),
        });
      } else {
        await apiFetch(`/working-hours/${index}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch {
      setDay(index, { enabled: !enabled });
      Alert.alert('Ошибка', 'Не удалось сохранить');
    } finally {
      setDay(index, { saving: false });
    }
  }

  async function saveTime(index: number) {
    const d = days[index]!;
    if (!d.enabled) return;
    const timeRe = /^\d{2}:\d{2}$/;
    if (!timeRe.test(d.startTime) || !timeRe.test(d.endTime)) {
      Alert.alert('Формат времени: ЧЧ:ММ (например, 09:00)');
      return;
    }
    setDay(index, { saving: true });
    try {
      await apiFetch(`/working-hours/${index}`, {
        method: 'PUT',
        body: JSON.stringify({ startTime: d.startTime, endTime: d.endTime }),
      });
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить');
    } finally {
      setDay(index, { saving: false });
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.hint}>Переключите дни, когда работаете, и задайте часы приёма</Text>

      {DAYS.map((_, i) => {
        const d = days[i]!;
        return (
          <View key={i} style={[styles.row, d.enabled && styles.rowActive]}>
            <View style={styles.dayLabel}>
              <Text style={[styles.dayShort, d.enabled && styles.dayShortActive]}>{DAYS[i]}</Text>
              <Text style={styles.dayFull}>{DAYS_FULL[i]}</Text>
            </View>

            <View style={styles.rowRight}>
              {d.enabled && (
                <View style={styles.timeInputs}>
                  <TextInput
                    style={styles.timeInput}
                    value={d.startTime}
                    onChangeText={(v) => setDay(i, { startTime: v })}
                    onBlur={() => void saveTime(i)}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    placeholder="09:00"
                  />
                  <Text style={styles.timeSep}>—</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={d.endTime}
                    onChangeText={(v) => setDay(i, { endTime: v })}
                    onBlur={() => void saveTime(i)}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    placeholder="18:00"
                  />
                </View>
              )}
              {d.saving ? (
                <ActivityIndicator size="small" color="#6366f1" style={{ marginLeft: 8 }} />
              ) : (
                <Switch
                  value={d.enabled}
                  onValueChange={(v) => void toggleDay(i, v)}
                  trackColor={{ true: '#6366f1', false: '#E5E7EB' }}
                  thumbColor="#fff"
                />
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  hint: { fontSize: 13, color: '#9CA3AF', marginBottom: 8 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  rowActive: { borderColor: '#E0E7FF' },
  dayLabel: {},
  dayShort: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
  dayShortActive: { color: '#6366f1' },
  dayFull: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInputs: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    width: 56,
    textAlign: 'center',
    color: '#111827',
  },
  timeSep: { fontSize: 14, color: '#9CA3AF' },
});
