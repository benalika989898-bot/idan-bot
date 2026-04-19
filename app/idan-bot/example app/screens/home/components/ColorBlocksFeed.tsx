import { useSettings } from '@/contexts/SettingsContext';
import { useImageTransitionStore } from '@/stores/imageTransitionStore';
import { Skeleton } from 'moti/skeleton';
import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import ColorBlockCard from './ColorBlockCard';

const CARD_WIDTH = 200;
const CARD_HEIGHT = 280;
const CARD_GAP = 12;
const FEED_PADDING = 16;

function StoriesSkeleton() {
  return (
    <Skeleton.Group show>
      <View style={{ alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <Skeleton colorMode="light" width={180} height={24} radius={8} />
        <Skeleton colorMode="light" width={260} height={18} radius={6} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: CARD_GAP, paddingHorizontal: FEED_PADDING }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} colorMode="light" width={CARD_WIDTH} height={CARD_HEIGHT} radius={16} />
        ))}
      </ScrollView>
    </Skeleton.Group>
  );
}

export default function ColorBlocksFeed() {
  const { settings, isLoading } = useSettings();
  const images = settings?.stories_image_urls ?? [];
  const displayImages = [...images].reverse();
  const feedRef = useRef<ScrollView>(null);
  const didInitialScroll = useRef(false);

  const registerScrollToCard = useImageTransitionStore((s) => s.registerScrollToCard);
  const unregisterScrollToCard = useImageTransitionStore((s) => s.unregisterScrollToCard);

  const scrollToCard = useCallback(
    (index: number, animated = true) => {
      const screenWidth = Dimensions.get('window').width;
      // Center the card in the viewport
      const cardStart = FEED_PADDING + index * (CARD_WIDTH + CARD_GAP);
      const offset = cardStart - (screenWidth - CARD_WIDTH) / 2;
      feedRef.current?.scrollTo({ x: Math.max(0, offset), animated });
    },
    [],
  );

  useEffect(() => {
    registerScrollToCard(scrollToCard);
    return () => unregisterScrollToCard();
  }, [scrollToCard, registerScrollToCard, unregisterScrollToCard]);

  if (isLoading) return <StoriesSkeleton />;
  if (displayImages.length === 0) return null;

  return (
    <Animated.View className="gap-4" style={{ direction: 'ltr' }} entering={FadeIn.duration(1000)}>
      {/* Section Header */}
      <View>
        <Text className="text-center text-xl font-semibold">העבודות שלנו</Text>
        <Text className="font-neutral-500 text-center text-base font-light">
          גללו כדי לראות את התספורות האחרונות שלנו
        </Text>
      </View>
      <ScrollView
        ref={feedRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => {
          if (didInitialScroll.current) return;
          didInitialScroll.current = true;
          requestAnimationFrame(() => {
            feedRef.current?.scrollToEnd({ animated: false });
          });
        }}
        contentContainerStyle={{ gap: CARD_GAP, paddingHorizontal: FEED_PADDING }}>
        {displayImages.map((url, index) => (
          <ColorBlockCard
            key={url}
            block={{ id: String(index), mediaUrl: url }}
            allMedia={displayImages}
            index={index}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}
