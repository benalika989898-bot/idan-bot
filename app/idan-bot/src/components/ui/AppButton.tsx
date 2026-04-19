import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

export function AppButton({
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
  style: externalStyle,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary'
      ? theme.text
      : variant === 'secondary'
        ? theme.backgroundElement
        : 'transparent';

  const textColor = variant === 'primary' ? theme.background : theme.text;

  return (
    <Pressable
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        {
          backgroundColor,
          borderColor: variant === 'ghost' ? theme.backgroundSelected : 'transparent',
          opacity: isDisabled ? 0.55 : state.pressed ? 0.78 : 1,
        },
        typeof externalStyle === 'function' ? externalStyle(state) : externalStyle,
      ]}
      {...props}>
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <ThemedText style={[styles.label, { color: textColor }]}>{title}</ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: Spacing.four,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
});
