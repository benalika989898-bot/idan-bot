import { useImageTransitionStore } from '@/stores/imageTransitionStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DISMISS_THRESHOLD = 40;
const SWIPE_X_THRESHOLD = 60;
const SNAP_BACK_CONFIG = { mass: 2.8, damping: 450, stiffness: 1000 };
const TRANSITION_OUT = 120;
const TRANSITION_IN = 220;
const CARD_WIDTH = 200;

export default function FullScreenBlock() {
  const router = useRouter();
  const { progress, goToFeed } = useImageTransitionStore();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const swipeX = useSharedValue(0);
  const transitionOverlay = useSharedValue(0);
  const navigatingRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  // Measure the current card's real position. Called when drag starts —
  // by the time the user finishes dragging, the async measure has resolved.
  // Only needed if the user swiped stories (original frame is already correct otherwise).
  const measureCurrentCard = useCallback(() => {
    if (!hasNavigatedRef.current) return;

    const { currentIndex, scrollToCard, measureFns, setFrame } = useImageTransitionStore.getState();
    const currentId = String(currentIndex);

    // Ensure card is centered in the feed
    scrollToCard?.(currentIndex, false);

    // Measure its actual on-screen position
    const measureFn = measureFns[currentId];
    if (measureFn) {
      measureFn().then((frame) => setFrame(frame)).catch(() => {});
    }
  }, []);

  const handleBack = useCallback(() => {
    // No navigation happened — original frame is still correct, just dismiss
    if (!hasNavigatedRef.current) {
      goToFeed(() => router.back());
      return;
    }

    const { currentIndex, scrollToCard, measureFns, setFrame } = useImageTransitionStore.getState();
    const currentId = String(currentIndex);

    scrollToCard?.(currentIndex, false);

    const dismiss = () => goToFeed(() => router.back());
    const measureFn = measureFns[currentId];
    if (measureFn) {
      measureFn()
        .then((frame) => { setFrame(frame); dismiss(); })
        .catch(() => dismiss());
    } else {
      dismiss();
    }
  }, [goToFeed, router]);

  const swapStory = useCallback(
    (newIndex: number) => {
      const { scrollToCard, frame, setFrame } = useImageTransitionStore.getState();
      const newId = String(newIndex);

      // Scroll the feed to center the active card (instant — hidden behind overlay)
      scrollToCard?.(newIndex, false);

      // Compute the card's on-screen position mathematically — instant, no async.
      // X: always centered (we just scrolled to center it).
      // Y: same for every card in the horizontal row (stays constant).
      const screenWidth = Dimensions.get('window').width;
      const centeredX = (screenWidth - CARD_WIDTH) / 2;
      setFrame({ ...frame, x: centeredX });

      // Swap the story while overlay is fully opaque (no flash)
      useImageTransitionStore.setState({ id: newId, currentIndex: newIndex });

      // Wait a frame for React to render the new Portal, then fade out
      requestAnimationFrame(() => {
        transitionOverlay.value = withTiming(0, {
          duration: TRANSITION_IN,
          easing: Easing.out(Easing.cubic),
        });
        navigatingRef.current = false;
      });
    },
    [transitionOverlay],
  );

  const navigateStory = useCallback(
    (direction: -1 | 1) => {
      if (navigatingRef.current) return;
      const { images, currentIndex } = useImageTransitionStore.getState();
      const newIndex = currentIndex + direction;
      if (newIndex < 0 || newIndex >= images.length) return;

      navigatingRef.current = true;
      hasNavigatedRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Fade overlay in fully, then swap the story
      transitionOverlay.value = withTiming(
        1,
        { duration: TRANSITION_OUT, easing: Easing.in(Easing.cubic) },
        () => {
          runOnJS(swapStory)(newIndex);
        },
      );
    },
    [transitionOverlay, swapStory],
  );

  // Vertical pan: dismiss (swipe down)
  const panGesture = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-20, 20])
    .onStart(() => {
      // Measure the real card position now — will resolve well before onEnd
      runOnJS(measureCurrentCard)();
    })
    .onUpdate((e) => {
      if (e.translationY <= 0) return;
      const newProgress = 1 - e.translationY / (screenHeight * 0.5);
      progress.value = Math.max(0, Math.min(1, newProgress));
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD) {
        runOnJS(handleBack)();
      } else {
        progress.value = withSpring(1, SNAP_BACK_CONFIG);
      }
    });

  // Horizontal pan: navigate between stories
  const horizontalPan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      swipeX.value = e.translationX;
    })
    .onEnd((e) => {
      // Swipe left → next story (+1), swipe right → previous story (-1)
      if (e.translationX < -SWIPE_X_THRESHOLD) {
        runOnJS(navigateStory)(1);
      } else if (e.translationX > SWIPE_X_THRESHOLD) {
        runOnJS(navigateStory)(-1);
      }
      swipeX.value = withTiming(0, { duration: 200 });
    });

  const gesture = Gesture.Race(panGesture, horizontalPan);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.6, 1], [0, 1]),
  }));

  // Fully opaque overlay — hides the Portal swap completely
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: transitionOverlay.value,
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={styles.gestureLayer} collapsable={false} />
      </GestureDetector>
      {/* Transition overlay — fully opaque black during story swap */}
      <Animated.View style={[styles.transitionOverlay, overlayStyle]} pointerEvents="none" />
      <Animated.View style={[styles.header, { paddingTop: insets.top + 8 }, headerStyle]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>✕</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 5,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
