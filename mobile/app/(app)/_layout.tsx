import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useAuthStore } from '../../stores/auth';

function TabIcon({ label, emoji }: { label: string; emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function AppLayout() {
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (!session) {
      router.replace('/(auth)/login');
    }
  }, [session]);

  if (!session) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#2a2a2a',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#a855f7',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? '✨' : '🌟'} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="moments"
        options={{
          title: 'Moments',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? '💫' : '🫧'} label="Moments" />
          ),
        }}
      />
      <Tabs.Screen
        name="chat/[characterId]"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? '💬' : '🗨️'} label="Chat" />
          ),
          href: null, // Hidden from tab bar by default; navigate programmatically
        }}
      />
      <Tabs.Screen
        name="profile/[characterId]"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? '💖' : '🫀'} label="Profile" />
          ),
          href: null, // Navigate programmatically
        }}
      />
    </Tabs>
  );
}
