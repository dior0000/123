import { Stack } from 'expo-router';

export default function ClientsLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ title: 'Клиент', headerBackTitle: 'Назад' }} />
    </Stack>
  );
}
