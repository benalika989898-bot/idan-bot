import { useAuth } from '@/contexts/AuthContext';
import { useFab } from '@/contexts/FabContext';
import { getSwapRequestsForUser } from '@/services/appointmentSwaps';
import { fetchLatestMessage } from '@/services/messageBoard';
import { DynamicIsland, useDynamicIsland } from '@/shared/ui/molecules/dynamic-island';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AboutUs from './components/AboutUsCard';
import ColorBlocksFeed from './components/ColorBlocksFeed';
import Footer from './components/Footer';
import Header from './components/Header';
import Products from './components/Products';
import TicketsBalance from './components/TicketsBalance';
import UpcomingAppointments from './components/UpcomingAppointments';
import WelcomeSection from './components/WelcomeSection';

const MessageBoardIsland = ({
  message,
  topInset,
  userId,
}: {
  message: { id: string; title: string; message: string; updated_at: string };
  topInset: number;
  userId: string;
}) => {
  const { expand } = useDynamicIsland();
  const [autoExpanded, setAutoExpanded] = useState(false);
  const [hasOpenedBefore, setHasOpenedBefore] = useState(true);
  const [hasLoadedOpenState, setHasLoadedOpenState] = useState(false);

  const storageKey = `message_board_seen_${message.id}_${message.updated_at}_${userId}`;

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(storageKey).then((val) => {
      if (!isMounted) return;
      setHasOpenedBefore(val === 'true');
      setHasLoadedOpenState(true);
    });

    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoadedOpenState || hasOpenedBefore || autoExpanded) return;

    const timer = setTimeout(() => {
      AsyncStorage.setItem(storageKey, 'true').catch(() => undefined);
      expand();
      setAutoExpanded(true);
      setHasOpenedBefore(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [hasLoadedOpenState, hasOpenedBefore, autoExpanded, expand, storageKey]);

  return (
    <DynamicIsland.Content>
      <View className=" flex-1 items-center justify-center px-2" style={{ paddingTop: topInset }}>
        <Text className="mb-2 text-center text-lg font-bold text-white">{message.title}</Text>
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <Text className="text-center text-base text-white/80">{message.message}</Text>
        </ScrollView>
        <SwipeUpArrow />
      </View>
    </DynamicIsland.Content>
  );
};

const MessageBoardCard = ({
  title,
  message,
  onCardHeight,
}: {
  title: string;
  message: string;
  onCardHeight?: (height: number) => void;
}) => {
  const { expand } = useDynamicIsland();
  const [isTruncated, setIsTruncated] = useState(false);

  return (
    <View className="px-4" onLayout={(e) => onCardHeight?.(e.nativeEvent.layout.height)}>
      <BlurView
        intensity={50}
        tint="dark"
        className="overflow-hidden rounded-2xl px-5 pb-5 pt-4"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 10,
        }}>
        <View className="mb-2 flex-row items-center gap-2" style={{ direction: 'rtl' }}>
          <Ionicons name="megaphone-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text className="text-left text-xs font-medium text-white/60">הודעה</Text>
        </View>
        <Text className="text-left text-base font-bold text-white">{title}</Text>
        <Text
          className="mt-1.5 text-left text-sm leading-5 text-white/80"
          numberOfLines={4}
          onTextLayout={(e) => setIsTruncated(e.nativeEvent.lines.length >= 4)}>
          {message}
        </Text>
        {isTruncated && (
          <Pressable onPress={expand} className="mt-2 self-start">
            <Text className="text-xs font-semibold text-white/50">קרא עוד...</Text>
          </Pressable>
        )}
      </BlurView>
    </View>
  );
};

const SwipeUpArrow = () => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      600,
      withRepeat(withTiming(-6, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true)
    );

    return () => {
      cancelAnimation(translateY);
      translateY.value = 0;
    };
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className="items-center pt-4 ">
      <Ionicons name="chevron-up" size={20} color="rgba(255,255,255,0.5)" />
    </Animated.View>
  );
};

const HomeScreen = () => {
  const { setIsPlus, setIsModalOpen } = useFab();
  const { session, user } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { data: swapRequests = [], refetch: refetchSwapRequests } = useQuery({
    queryKey: ['swap-requests-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await getSwapRequestsForUser(user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const [lastSeenAt, setLastSeenAt] = useState<number | null>(null);

  useEffect(() => {
    const loadLastSeen = async () => {
      if (!user?.id) {
        setLastSeenAt(null);
        return;
      }
      const stored = await AsyncStorage.getItem(`swap_notifications_last_seen_${user.id}`);
      setLastSeenAt(stored ? Number(stored) : null);
    };

    loadLastSeen();
  }, [user?.id]);

  useEffect(() => {
    if (!isFocused) return;

    const syncFocusState = async () => {
      if (!user?.id) {
        setLastSeenAt(null);
      } else {
        const stored = await AsyncStorage.getItem(`swap_notifications_last_seen_${user.id}`);
        setLastSeenAt(stored ? Number(stored) : null);
      }
      refetchSwapRequests();
    };

    syncFocusState();
  }, [isFocused, refetchSwapRequests, user?.id]);

  const pendingCount = swapRequests.filter((request) => {
    if (request.recipient_id !== user?.id || request.status !== 'pending') return false;
    if (!lastSeenAt) return true;
    return new Date(request.created_at).getTime() > lastSeenAt;
  }).length;

  const [cardHeight, setCardHeight] = useState(0);

  const { data: latestMessageData } = useQuery({
    queryKey: ['message-board-latest'],
    queryFn: fetchLatestMessage,
    staleTime: 5 * 60 * 1000,
  });

  const latestMessage = latestMessageData;

  useEffect(() => {
    if (!isFocused) return;
    setIsPlus(true);
    setIsModalOpen(false);
  }, [isFocused, setIsModalOpen, setIsPlus]);

  return (
    <DynamicIsland.Provider
      config={{
        expandedHeight: Dimensions.get('window').height / 1.5,
        expandedWidth: Dimensions.get('window').width,
        topOffset: 0,
      }}>
      {latestMessage && user?.id && (
        <MessageBoardIsland message={latestMessage} topInset={insets.top} userId={user.id} />
      )}
      <View className="flex-1 bg-white" style={{ direction: 'rtl' }}>
        {/* Profile Image Button & Tickets */}
        <View style={{ top: insets.top }} className="absolute left-6 right-6 top-0 z-10">
          <LinearGradient
            colors={['rgba(0,0,0,0.50)', 'rgba(0,0,0,0)']}
            style={{
              position: 'absolute',
              left: -24,
              right: -24,
              top: -insets.top,
              height: 150,
            }}
            pointerEvents="none"
          />
          <View className="flex-row-reverse items-center justify-between">
            <View className="flex-row-reverse items-center gap-3">
              <TicketsBalance />
              <Pressable
                onPress={() => {
                  if (session && user) {
                    router.push('/notifications');
                  } else {
                    router.push('/login');
                  }
                }}
                className="relative h-12 w-12 items-center justify-center rounded-full bg-white/80">
                <Ionicons name="notifications-outline" size={22} color="#111827" />
                {pendingCount > 0 && (
                  <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1">
                    <Text className="text-xs font-semibold text-white">{pendingCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Profile Button */}
            <Pressable
              onPress={() => {
                if (session && user) {
                  router.push('/edit-profile');
                } else {
                  router.push('/login');
                }
              }}
              className="h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              {user?.avatar_url ? (
                <View className="h-14 w-14 overflow-hidden rounded-full border-2 border-white/50">
                  <Image
                    source={{ uri: user.avatar_url }}
                    style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                    transition={1000}
                    contentFit="cover"
                  />
                </View>
              ) : (
                <View className="h-11 w-11 items-center justify-center rounded-full bg-white/80">
                  <Ionicons name="person" size={24} color="#374151" />
                </View>
              )}
            </Pressable>
          </View>
        </View>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}>
          <View className="relative">
            <Header />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', 'rgba(255,255,255,0.95)']}
              locations={[0.4, 0.78, 1]}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 180,
              }}
            />
          </View>
          <Animated.View
            layout={LinearTransition.duration(400)}
            className="flex-1 gap-6 rounded-t-[34px] border-t border-black/5 bg-white pb-8 shadow-2xl"
            style={{
              paddingTop: latestMessage ? cardHeight / 2 + 28 : 28,
              marginTop: latestMessage ? -(cardHeight / 2) - 34 : -34,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.06,
              shadowRadius: 24,
              elevation: 18,
            }}>
            {latestMessage && (
              <Animated.View
                layout={LinearTransition.duration(400)}
                style={{
                  marginBottom: -(cardHeight / 2),
                  zIndex: 20,
                }}>
                <MessageBoardCard
                  title={latestMessage.title}
                  message={latestMessage.message}
                  onCardHeight={setCardHeight}
                />
              </Animated.View>
            )}
            <View className="px-1">
              <WelcomeSection />
            </View>
            <UpcomingAppointments />
            <AboutUs />
            <ColorBlocksFeed />
            <Products />
            <Footer />
          </Animated.View>
        </Animated.ScrollView>
      </View>
    </DynamicIsland.Provider>
  );
};

export default HomeScreen;
