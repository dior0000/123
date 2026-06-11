import { Stack } from 'expo-router';

export default function ServicesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Услуги' }} />
      <Stack.Screen name="[id]" options={{ title: 'Услуга', presentation: 'modal' }} />
    </Stack>
  );
}
