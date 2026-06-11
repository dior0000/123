import { Stack } from 'expo-router';

export default function AppointmentLayout() {
  return (
    <Stack>
      <Stack.Screen name="new" options={{ title: 'Новая запись', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Запись', headerBackTitle: 'Назад' }} />
    </Stack>
  );
}
