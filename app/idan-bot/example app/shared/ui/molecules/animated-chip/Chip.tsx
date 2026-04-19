import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { AnimatedChip } from './AnimatedChip';
import type { ChipGroupProps, ChipItem } from './Chip.types';

export const ChipGroup: React.FC<ChipGroupProps<ChipItem>> = ({
  chips,
  onChange,
  containerStyle,
  selectedIndex,
}) => {
  const [internalIndex, setInternalIndex] = useState(selectedIndex ?? 0);
  const lastControlledIndex = useRef<number | undefined>(selectedIndex);

  useEffect(() => {
    if (selectedIndex === undefined) {
      lastControlledIndex.current = undefined;
      return;
    }

    if (selectedIndex !== lastControlledIndex.current) {
      lastControlledIndex.current = selectedIndex;
      setInternalIndex(selectedIndex);
    }
  }, [selectedIndex]);

  const handlePress = (index: number) => {
    setInternalIndex(index);
    onChange?.(index);
  };

  return (
    <Animated.View style={[styles.container, containerStyle]} layout={LinearTransition}>
      {chips.map((item, index) => (
        <AnimatedChip
          key={index}
          label={item.label}
          inActiveBackgroundColor={item.inActiveBackgroundColor}
          activeColor={item.activeColor}
          icon={item.icon}
          labelColor={item.labelColor}
          isActive={internalIndex === index}
          onPress={() => handlePress(index)}
        />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    direction: 'ltr',
    gap: 8,
  },
});
