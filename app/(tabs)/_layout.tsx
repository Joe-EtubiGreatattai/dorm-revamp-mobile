import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

import { electionAPI } from '@/utils/apiClient';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColors = Colors[colorScheme ?? 'light'];
  const [activeElectionsCount, setActiveElectionsCount] = React.useState(0);

  React.useEffect(() => {
    const fetchElections = async () => {
      try {
        const { data } = await electionAPI.getElections();
        const active = data.filter((e: any) => e.status === 'Open').length;
        setActiveElectionsCount(active);
      } catch (error) {
        console.log('Error fetching elections count:', error);
      }
    };
    fetchElections();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColors.tint,
        tabBarInactiveTintColor: activeColors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: activeColors.card,
          borderTopColor: activeColors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => <TabBarIcon name="cart-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="housing"
        options={{
          title: 'Housing',
          tabBarIcon: ({ color }) => <TabBarIcon name="business-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <TabBarIcon name="book-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="voting"
        options={{
          title: 'Voting',
          tabBarIcon: ({ color }) => <TabBarIcon name="stats-chart-outline" color={color} />,
          tabBarBadge: activeElectionsCount > 0 ? activeElectionsCount : undefined,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null, // Hide the template's second tab
        }}
      />
    </Tabs>
  );
}
