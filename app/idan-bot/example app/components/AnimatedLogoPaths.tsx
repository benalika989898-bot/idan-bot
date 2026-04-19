import { useVideoPlayer, VideoView } from 'expo-video';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export const LOGO_ANIMATION_DURATION = 3000;

const splashVideo = require('../../assets/lottie-animations/splash.mp4');

function AnimatedLogoPathsInner() {
  const [videoFinished, setVideoFinished] = useState(false);
  const opacity = useSharedValue(1);

  const player = useVideoPlayer(splashVideo, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      setVideoFinished(true);
      opacity.value = withRepeat(
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    });

    return () => {
      subscription.remove();
    };
  }, [player]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      {!videoFinished ? (
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          contentFit="cover"
        />
      ) : (
        <Animated.View style={[styles.video, pulseStyle]}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            contentFit="contain"
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  video: {          
    width: '100%',
    height: '100%',
  },
});

const AnimatedLogoPaths = memo(AnimatedLogoPathsInner);

export default AnimatedLogoPaths;
