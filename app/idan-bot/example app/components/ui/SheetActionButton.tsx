import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type SheetActionButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  icon?: React.ReactNode;
};

const SheetActionButton = ({
  label,
  onPress,
  variant = 'outline',
  disabled = false,
  isLoading = false,
  loadingLabel,
  icon,
}: SheetActionButtonProps) => {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || isLoading;
  const backgroundClass = isPrimary ? (isDisabled ? 'bg-slate-200' : 'bg-black') : 'bg-white';
  const borderClass = isPrimary ? '' : 'border border-slate-200';
  const textClass = isPrimary ? (isDisabled ? 'text-slate-500' : 'text-white') : 'text-slate-700';
  const indicatorColor = isPrimary ? '#ffffff' : '#111827';

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 rounded-2xl py-3 ${backgroundClass} ${borderClass}`}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
      })}>
      {isLoading ? (
        <>
          <Text className={` text-sm font-semibold ${textClass}`}>{loadingLabel || label}</Text>
          <ActivityIndicator size="small" color={indicatorColor} />
        </>
      ) : (
        <>
          <Text className={`text-sm font-semibold ${textClass}`}>{label}</Text>
          {icon ? <View className="">{icon}</View> : null}
        </>
      )}
    </Pressable>
  );
};

export default SheetActionButton;
