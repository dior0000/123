import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export const ONBOARDED_KEY = 'pb_onboarded';

const SLIDES = [
  {
    id: '1',
    emoji: '📱',
    title: 'Бизнес в кармане',
    body: 'Управляйте записями, клиентами и расписанием прямо со смартфона — в любое время.',
  },
  {
    id: '2',
    emoji: '📅',
    title: 'Клиенты записываются сами',
    body: 'Поделитесь ссылкой — клиенты запишутся без звонков и мессенджеров.',
  },
  {
    id: '3',
    emoji: '✅',
    title: 'Всё под контролем',
    body: 'Напоминания, оплата и CRM — больше ничего не потеряется.',
  },
];

const { width: SCREEN_W } = Dimensions.get('window');

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const finish = async () => {
    await SecureStore.setItemAsync(ONBOARDED_KEY, '1');
    router.replace('/auth/phone');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      const nextIdx = index + 1;
      listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setIndex(nextIdx);
    } else {
      void finish();
    }
  };

  const renderItem: ListRenderItem<(typeof SLIDES)[number]> = ({ item }) => (
    <View style={styles.slide}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <Pressable style={styles.btn} onPress={next}>
        <Text style={styles.btnText}>{index < SLIDES.length - 1 ? 'Далее' : 'Начать'}</Text>
      </Pressable>

      {index < SLIDES.length - 1 && (
        <Pressable onPress={() => void finish()} style={styles.skip}>
          <Text style={styles.skipText}>Пропустить</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emoji: { fontSize: 72, marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 16, color: '#111827' },
  body: { fontSize: 16, textAlign: 'center', lineHeight: 24, color: '#6B7280' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: '#7C3AED', width: 24 },
  btn: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skip: { alignItems: 'center', paddingBottom: 24 },
  skipText: { color: '#9CA3AF', fontSize: 14 },
});
