import AnimatedLogoPaths, { LOGO_ANIMATION_DURATION } from '@/components/AnimatedLogoPaths';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

const DIAGONAL = Math.sqrt(SCREEN_WIDTH ** 2 + SCREEN_HEIGHT ** 2);
const CIRCLE_RADIUS = DIAGONAL;
const CIRCLE_SIZE = CIRCLE_RADIUS * 2;
const SWOOP_DURATION = 700;
const LOGO_SHOW_DURATION = 150;
const SWOOP_DELAY = LOGO_SHOW_DURATION;
const ICON_DURATION = 600;

const EASE_OUT = Easing.bezier(0.25, 1, 0.3, 1);
const ICON_EASE = Easing.bezier(0.3, 1, 0.25, 1);

export function AnimatedSplashOverlay({ ready = false }: { ready?: boolean }) {
  const [visible, setVisible] = useState(true);
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const closingRef = useRef(false);

  // Circle scale: 1 = covers screen, 0 = gone
  const circleScale = useSharedValue(1);

  // Logo bounce values
  const logoScaleX = useSharedValue(1);
  const logoScaleY = useSharedValue(1);
  const logoTranslateY = useSharedValue(0);
  const logoOpacity = useSharedValue(1);

  useEffect(() => {
    const completionTimer = setTimeout(() => {
      setLogoAnimationComplete(true);
    }, LOGO_ANIMATION_DURATION);

    return () => clearTimeout(completionTimer);
  }, []);

  // Trigger close animation when ready
  useEffect(() => {
    if (!ready || !logoAnimationComplete || closingRef.current) return;

    const closeTimer = setTimeout(() => {
      closingRef.current = true;

      // Keep the logo transition simple so the circle shrink owns the motion.
      logoOpacity.value = withTiming(0, { duration: 180 });
      logoScaleX.value = withTiming(0.92, { duration: 180, easing: EASE_OUT });
      logoScaleY.value = withTiming(0.92, { duration: 180, easing: EASE_OUT });
      logoTranslateY.value = withTiming(-8, { duration: 180, easing: EASE_OUT });

      // Start the circle shrink almost immediately to reduce exposed splash time.
      circleScale.value = withDelay(
        SWOOP_DELAY,
        withTiming(0, { duration: SWOOP_DURATION, easing: EASE_OUT })
      );

      // Unmount after animation completes (JS-side timer, no worklet bridging needed)
      setTimeout(
        () => {
          setVisible(false);
        },
        SWOOP_DELAY + SWOOP_DURATION + 50
      );
    }, 0);

    return () => clearTimeout(closeTimer);
  }, [logoAnimationComplete, ready]);

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scaleX: logoScaleX.value },
      { scaleY: logoScaleY.value },
      { translateY: logoTranslateY.value },
    ],
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      <Animated.View style={[styles.circle, circleAnimatedStyle]} />
      <Animated.View style={[StyleSheet.absoluteFillObject, { zIndex: 1001 }, logoAnimatedStyle]}>
        <AnimatedLogoPaths />
      </Animated.View>
    </View>
  );
}

export function AnimatedIcon() {
  const iconScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(1.3);

  useEffect(() => {
    // Icon background: 0 → 1.1 (60%) → 1
    iconScale.value = withSequence(
      withTiming(1.1, { duration: ICON_DURATION * 0.6, easing: ICON_EASE }),
      withTiming(1, { duration: ICON_DURATION * 0.4, easing: ICON_EASE })
    );

    // Logo: stay invisible for 40%, then fade in + scale down
    logoOpacity.value = withDelay(
      ICON_DURATION * 0.4,
      withTiming(1, { duration: ICON_DURATION * 0.6, easing: ICON_EASE })
    );
    logoScale.value = withDelay(
      ICON_DURATION * 0.4,
      withTiming(1, { duration: ICON_DURATION * 0.6, easing: ICON_EASE })
    );
  }, []);

  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const imgStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={[styles.background, bgStyle]} />
      <Animated.View style={[styles.imageContainer, imgStyle]}>
        <Image style={styles.image} source={require('@/assets/images/logo.jpg')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_RADIUS,
    backgroundColor: '#000000',
    left: SCREEN_WIDTH - CIRCLE_RADIUS,
    top: SCREEN_HEIGHT - CIRCLE_RADIUS,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
});
