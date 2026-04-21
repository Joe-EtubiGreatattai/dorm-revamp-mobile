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

import { chatAPI, electionAPI, marketAPI, notificationAPI, orderAPI, postAPI } from '@/utils/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColors = Colors[colorScheme ?? 'light'];
  const queryClient = useQueryClient();

  // Prefetch data for all main tabs
  React.useEffect(() => {
    // 1. Feed
    queryClient.prefetchInfiniteQuery({
      queryKey: ['posts', 'All'],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await postAPI.getFeed(pageParam as number, 20, 'All');
        return res.data;
      },
      initialPageParam: 1
    });

    // 2. Market (Default State)
    const defaultFilters = { minPrice: '', maxPrice: '', condition: 'Any', onCampus: true, rating: 0 };
    queryClient.prefetchInfiniteQuery({
      queryKey: ['marketItems', 'item', 'All', '', defaultFilters],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await marketAPI.getItems({
          type: 'item',
          category: undefined,
          search: undefined,
          page: pageParam as number,
          minPrice: '',
          maxPrice: '',
          condition: undefined,
        });
        return res.data;
      },
      initialPageParam: 1
    });

    // 3. User Data
    queryClient.prefetchQuery({ queryKey: ['notifications'], queryFn: () => notificationAPI.getNotifications().then(res => res.data) });
    queryClient.prefetchQuery({ queryKey: ['orders'], queryFn: () => orderAPI.getOrders().then(res => res.data) });
    queryClient.prefetchQuery({ queryKey: ['unreadChat'], queryFn: () => chatAPI.getUnreadCount().then(res => res.data) });

  }, [queryClient]);

  // Use Query for elections to keep it fresh
  const { data: elections = [] } = useQuery({
    queryKey: ['elections'],
    queryFn: async () => {
      const { data } = await electionAPI.getElections();
      return data;
    },
    refetchInterval: 30000 // Refetch every 30s
  });

  const activeElectionsCount = Array.isArray(elections)
    ? elections.filter((e: any) => e.status === 'Open').length
    : 0;

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
        name="reels"
        options={{
          href: null,
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
