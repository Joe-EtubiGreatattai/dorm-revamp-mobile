import CreatePostModal from '@/components/CreatePostModal';
import PostCard from '@/components/PostCard';
import PostSkeleton from '@/components/PostSkeleton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { API_URL, chatAPI, electionAPI, notificationAPI, orderAPI, postAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';

export default function FeedScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'All' | 'My'>('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [stats, setStats] = useState({ elections: 0, orders: 0, notifications: 0, messages: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = React.useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const [postsRes, notifRes, ordersRes, electionsRes, messagesRes] = await Promise.all([
        postAPI.getFeed(),
        notificationAPI.getNotifications(),
        orderAPI.getOrders(),
        electionAPI.getElections(),
        chatAPI.getUnreadCount()
      ]);

      setPosts(postsRes.data.posts);
      setStats({
        notifications: notifRes.data.filter((n: any) => !n.isRead).length,
        orders: ordersRes.data.filter((o: any) => o.status !== 'delivered').length,
        elections: electionsRes.data.filter((e: any) => e.status === 'active').length,
        messages: messagesRes.data.count
      });
    } catch (error) {
      console.log('Error fetching feed data:', error);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData(true);

    // Socket listeners for real-time updates
    const socket = getSocket();

    socket.on('post:new', (newPost: any) => {
      setPosts(prevPosts => [newPost, ...prevPosts]);
    });

    socket.on('post:updated', (updatedPost: any) => {
      setPosts(prevPosts => prevPosts.map(p => p._id === updatedPost._id ? updatedPost : p));
    });

    socket.on('notification:message', () => {
      setStats(prev => ({ ...prev, messages: prev.messages + 1 }));
    });

    socket.on('notification:unreadCount', (count: number) => {
      setStats(prev => ({ ...prev, notifications: count }));
    });

    socket.on('notification:new', () => {
      setStats(prev => ({ ...prev, notifications: prev.notifications + 1 }));
    });

    return () => {
      socket.off('post:new');
      socket.off('post:updated');
      socket.off('notification:message');
      socket.off('notification:unreadCount');
      socket.off('notification:new');
    };
  }, [fetchData]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const filteredPosts = posts.filter(post => {
    if (activeTab === 'My') {
      // My School tab: Show only posts from my school
      return post.visibility === 'school' && post.school === user?.university;
    }
    // All tab: Show only public posts
    return post.visibility === 'public';
  });

  const getAvatarUri = (avatarPath?: string) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) return avatarPath;
    // Replace backslashes (Windows) and handle leading slash
    const normalizedPath = avatarPath.replace(/\\/g, '/');
    return `${API_URL.replace('/api', '')}/${normalizedPath}`;
  };

  const UserAvatar = () => {
    const avatarUri = getAvatarUri(user?.avatar);
    const initials = user?.name
      ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <UserAvatar />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Dorm</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={26} color={colors.text} />
            {stats.notifications > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{stats.notifications}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/messages')}>
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
        data={isLoading ? [1, 2, 3] : filteredPosts}
        extraData={posts}
        keyExtractor={(item, index) => isLoading ? `skeleton-${index}` : item._id}
        renderItem={({ item }) => isLoading ? <PostSkeleton /> : <PostCard post={item} />}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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
});
