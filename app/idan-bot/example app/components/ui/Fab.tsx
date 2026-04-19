import { useFab } from '@/contexts/FabContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn, ZoomIn, ZoomOut } from 'react-native-reanimated';

const Fab = ({ onPress, icon }: { onPress: () => void; icon: keyof typeof Ionicons.glyphMap }) => {
  const isPlus = icon === 'add';
  const { setIsPlus } = useFab();

  React.useEffect(() => {
    // Small delay to ensure smooth transition during navigation
    const timer = setTimeout(() => {
      setIsPlus(isPlus);
    }, 50);

    return () => clearTimeout(timer);
  }, [isPlus, setIsPlus]);

  return (
    <Animated.View entering={!isPlus ? ZoomIn : null} exiting={isPlus ? ZoomOut : FadeIn}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        className={`h-16 w-16 items-center justify-center self-center rounded-full shadow-sm transition-all duration-300 active:scale-95  ${isPlus ? 'bg-white' : 'bg-neutral-500'}`}>
        {isPlus ? (
          <Animated.View>
            <Ionicons name="add" size={24} color="black" />
          </Animated.View>
        ) : (
          <Animated.View>
            <Ionicons name="close" size={24} color="white" />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
};

export default Fab;
