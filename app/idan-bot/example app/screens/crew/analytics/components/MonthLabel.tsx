import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

type MonthLabelProps = {
  label: string;
  index: number;
  activeIndex: SharedValue<number>;
};

export default function MonthLabel({ label, index, activeIndex }: MonthLabelProps) {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const relativePosition = activeIndex.value - index;
    const absPos = Math.abs(relativePosition);

    return {
      opacity: interpolate(absPos, [0, 0.8, 1.5], [1, 0.4, 0], 'clamp'),
      transform: [
        {
          translateX: interpolate(
            relativePosition,
            [-2, -1, 0, 1, 2],
            [200, 100, 0, -100, -200],
            'clamp'
          ),
        },
        { scale: interpolate(absPos, [0, 0.5, 1], [1.1, 0.9, 0.8], 'clamp') },
      ],
    };
  });

  return (
    <Animated.Text style={animatedStyle} className="absolute text-lg font-bold text-gray-800">
      {label}
    </Animated.Text>
  );
}
