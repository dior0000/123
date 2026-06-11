import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Сегодня',
          tabBarLabel: 'Сегодня',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Календарь',
          tabBarLabel: 'Календарь',
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Клиенты',
          tabBarLabel: 'Клиенты',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarLabel: 'Профиль',
        }}
      />
    </Tabs>
  );
}
