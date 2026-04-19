import { useMeasure } from '@/hooks/useMeasure';
import { useImageTransitionStore } from '@/stores/imageTransitionStore';
import { isStoryVideoUrl, generateVideoThumbnail } from '@/utils/storyMedia';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { Portal } from 'react-native-teleport';

const CARD_WIDTH = 200;
const CARD_HEIGHT = 280;

export type StoryBlock = {
  id: string;
  mediaUrl: string;
};

type Props = {
  block: StoryBlock;
  allMedia: string[];
  index: number;
};

function StoryVideo({ mediaUrl, isFullscreen }: { mediaUrl: string; isFullscreen: boolean }) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  useEffect(() => {
    generateVideoThumbnail(mediaUrl).then(setThumbnailUri);
  }, [mediaUrl]);

  // Only create the video player once we go fullscreen
  const player = useVideoPlayer(
    isFullscreen || playerReady ? { uri: mediaUrl } : null,
    (p) => {
      p.loop = true;
      p.muted = false;
      p.play();
    }
  );

  useEffect(() => {
    if (isFullscreen) {
      setPlayerReady(true);
    }
  }, [isFullscreen]);

  // Listen for the player to actually start playing
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('playingChange', (e) => {
      if (e.isPlaying) setVideoPlaying(true);
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (!player) return;
    if (isFullscreen) {
      player.muted = false;
      player.play();
    } else {
      player.pause();
      setVideoPlaying(false);
    }
  }, [isFullscreen, player]);

  // Hide thumbnail only when fullscreen AND video is actually playing
  const showThumbnail = !isFullscreen || !videoPlaying;

  return (
    <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#1a1a1a' }}>
      {player && (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      )}
      {showThumbnail && thumbnailUri && (
        <Image
          source={{ uri: thumbnailUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="disk"
        />
      )}
    </View>
  );
}

export default function ColorBlockCard({ block, allMedia, index }: Props) {
  const router = useRouter();
  const { ref, measure } = useMeasure();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isVideo = isStoryVideoUrl(block.mediaUrl);

  const registerMeasure = useImageTransitionStore((state) => state.registerMeasure);
  const unregisterMeasure = useImageTransitionStore((state) => state.unregisterMeasure);

  useEffect(() => {
    registerMeasure(block.id, measure);
    return () => unregisterMeasure(block.id);
  }, [block.id, measure, registerMeasure, unregisterMeasure]);

  const shouldMove = useImageTransitionStore((state) => state.id === block.id);
  const destination = useImageTransitionStore((state) =>
    shouldMove ? state.destination : undefined
  );
  const frame = useImageTransitionStore((state) => state.frame);
  const frameX = useImageTransitionStore((state) => state.frameX);
  const frameY = useImageTransitionStore((state) => state.frameY);
  const progress = useImageTransitionStore((state) => state.progress);

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const layout = await measure();
      useImageTransitionStore.setState({ id: block.id, images: allMedia, currentIndex: index });
      router.push('/fullscreen-block');
      useImageTransitionStore.getState().goToFullScreen(layout);
    } catch (error) {
      console.warn('⚠️ [ColorBlockCard] Failed to measure block before transition:', {
        blockId: block.id,
        error,
      });
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (!shouldMove) {
      return {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 16,
        transform: [{ translateX: 0 }, { translateY: 0 }],
      };
    }
    const p = progress.value;
    return {
      width: interpolate(p, [0, 1], [CARD_WIDTH, screenWidth]),
      height: interpolate(p, [0, 1], [CARD_HEIGHT, screenHeight]),
      borderRadius: interpolate(p, [0, 1], [16, 0]),
      transform: [
        { translateX: interpolate(p, [0, 1], [0, -frameX.value]) },
        { translateY: interpolate(p, [0, 1], [0, -frameY.value]) },
      ],
    };
  });

  // The Portal hostName controls where this single image instance renders:
  // undefined  → in-place in the feed card
  // "overlay"  → floating above all screens (fullscreen display + animation)
  const portalDestination = destination === 'overlay' ? 'overlay' : undefined;

  return (
    <View
      ref={ref}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 16, overflow: 'hidden' }}
      collapsable={false}>
      <Pressable
        className="transition-all duration-300 ease-in-out active:scale-95"
        onPress={handlePress}
        style={{ flex: 1 }}>
        <Portal hostName={portalDestination} name={`block-${block.id}`}>
          <View
            style={
              portalDestination
                ? { position: 'absolute', left: frame.x, top: frame.y }
                : { flex: 1 }
            }>
            <Animated.View style={[{ overflow: 'hidden' }, animatedStyle]}>
              {isVideo ? (
                <StoryVideo
                  mediaUrl={block.mediaUrl}
                  isFullscreen={portalDestination === 'overlay'}
                />
              ) : (
                <Image
                  source={{ uri: block.mediaUrl }}
                  style={{ flex: 1, width: '100%', height: '100%' }}
                  contentFit="cover"
                  cachePolicy="disk"
                />
              )}
            </Animated.View>
          </View>
        </Portal>
      </Pressable>
    </View>
  );
}
