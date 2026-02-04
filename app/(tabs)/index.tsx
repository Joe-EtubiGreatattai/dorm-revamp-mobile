import CreatePostModal from '@/components/CreatePostModal';
import PostCard from '@/components/PostCard';
import PostSkeleton from '@/components/PostSkeleton';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useThrottledCallback } from '@/hooks/useThrottledCallback';
import { API_URL, chatAPI, notificationAPI, orderAPI, postAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

const UserAvatar = React.memo(({ user }: { user: any }) => {
  const getAvatarUri = (avatarPath?: string) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) return avatarPath;
    const normalizedPath = avatarPath.replace(/\\/g, '/');
    return `${API_URL.replace('/api', '')}/${normalizedPath}`;
  };

  const avatarUri = getAvatarUri(user?.avatar);
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  if (avatarUri) {
    return (
      <Image
        source={{ uri: avatarUri }}
        style={styles.avatar}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View style={[styles.avatar, styles.initialsContainer]}>
      <Text style={styles.initialsText}>{initials}</Text>
    </View>
  );
});

export default function FeedScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'All' | 'My'>('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewablePostId, setViewablePostId] = useState<string | null>(null);

  const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setViewablePostId(viewableItems[0].item?._id || null);
    }
  }).current;

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  // --- Queries ---

  // 1. Posts (Infinite Scroll)
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isPostsLoading,
    refetch: refetchPosts,
    isRefetching: isPostsRefetching
  } = useInfiniteQuery({
    queryKey: ['posts', activeTab],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await postAPI.getFeed(pageParam as number, 20, activeTab);
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.currentPage < lastPage.totalPages) return lastPage.currentPage + 1;
      return undefined;
    },
  });

  const posts = postsData?.pages.flatMap(page => page.posts) || [];

  // 2. Notifications Count
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationAPI.getNotifications();
      return res.data;
    }
  });

  // 3. Orders
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await orderAPI.getOrders();
      return res.data;
    }
  });

  // 4. Messages Count
  const { data: messagesShot } = useQuery({
    queryKey: ['unreadChat'],
    queryFn: async () => {
      const res = await chatAPI.getUnreadCount();
      return res.data;
    }
  });

  const stats = {
    notifications: notifications.filter((n: any) => !n.isRead).length,
    orders: orders.filter((o: any) => o.status !== 'delivered').length,
    messages: messagesShot?.count || 0
  };

  // --- Socket Listeners ---
  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('post:new', (newPost: any) => {
      // Optimistically update the cache for the current tab
      queryClient.setQueryData(['posts', activeTab], (oldData: any) => {
        if (!oldData) return oldData;
        const newFirstPage = {
          ...oldData.pages[0],
          posts: [newPost, ...oldData.pages[0].posts]
        };
        return {
          ...oldData,
          pages: [newFirstPage, ...oldData.pages.slice(1)]
        };
      });
    });

    socket.on('post:updated', (updatedPost: any) => {
      queryClient.setQueryData(['posts', activeTab], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: any) => p._id === updatedPost._id ? updatedPost : p)
          }))
        };
      });
    });

    socket.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('notification:message', () => {
      queryClient.invalidateQueries({ queryKey: ['unreadChat'] });
    });

    return () => {
      socket.off('post:new');
      socket.off('post:updated');
      socket.off('notification:new');
      socket.off('notification:message');
    };
  }, [queryClient, activeTab]);

  const onRefresh = React.useCallback(async () => {
    await Promise.all([
      refetchPosts(),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['unreadChat'] })
    ]);
  }, [refetchPosts, queryClient]);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };


  const filteredPosts = posts;



  const navigateToProfile = useThrottledCallback(() => router.push('/profile'), 1000);
  const navigateToNotifications = useThrottledCallback(() => router.push('/notifications'), 1000);
  const navigateToMessages = useThrottledCallback(() => router.push('/messages'), 1000);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={navigateToProfile}>
          <UserAvatar user={user} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Dorm</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={navigateToNotifications}>
            <Ionicons name="notifications-outline" size={26} color={colors.text} />
            {stats.notifications > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{stats.notifications}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={navigateToMessages}>
            <Ionicons name="chatbubbles-outline" size={26} color={colors.text} />
            {stats.messages > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{stats.messages}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('All')}
          style={[styles.tab, activeTab === 'All' && { borderBottomColor: colors.primary }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'All' ? colors.text : colors.subtext }]}>All Schools</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('My')}
          style={[styles.tab, activeTab === 'My' && { borderBottomColor: colors.primary }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'My' ? colors.text : colors.subtext }]}>My School</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={isPostsLoading ? [1, 2, 3] : filteredPosts}
        extraData={posts}
        keyExtractor={(item, index) => isPostsLoading ? `skeleton-${index}` : item._id}
        renderItem={({ item }) => isPostsLoading ? <PostSkeleton /> : <PostCard post={item} isViewable={item._id === viewablePostId} />}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          !isPostsLoading ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIllustration, { backgroundColor: colors.card }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={60} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No posts yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                Be the first to share something with your fellow students!
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => {/* Open Create Post Modal if you had one, or scrolling to some action */ }}
              >
                <Text style={styles.emptyBtnText}>Create First Post</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={isPostsRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <PostSkeleton />
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.text }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color={colors.background} />
      </TouchableOpacity>

      <CreatePostModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  iconBtn: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
  },
  feedContent: {
    paddingBottom: 100,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  initialsContainer: {
    backgroundColor: '#6366f1', // Indigo 500
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  statsFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  statBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  statNumber: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
  },
  statLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyBtnText: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
  },
  footerLoader: {
    paddingBottom: 20,
  },
});
