import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import React from 'react';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'header';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return disabled ? 'bg-gray-400' : 'bg-gray-600';
      case 'outline':
        return disabled 
          ? 'bg-transparent border-2 border-gray-400' 
          : 'bg-transparent border-2 border-gray-800';
      case 'header':
        return disabled ? 'bg-gray-300' : 'bg-black';
      default:
        return disabled ? 'bg-gray-400' : 'bg-black';
    }
  };

  const getSizeStyles = () => {
    const radius = variant === 'header' ? 'rounded-md' : 'rounded-full';
    switch (size) {
      case 'sm':
        return variant === 'header' ? `px-3 py-1 ${radius}` : `px-4 py-2 ${radius}`;
      case 'lg':
        return `px-8 py-4 ${radius}`;
      default:
        return `px-6 py-3 ${radius}`;
    }
  };

  const getTextStyles = () => {
    const baseStyles = 'font-medium text-center';
    const sizeStyles = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base';
    const colorStyles = (() => {
      if (variant === 'outline') {
        return disabled ? 'text-gray-400' : 'text-gray-800';
      }
      if (disabled) return 'text-gray-500';
      return 'text-white';
    })();
    return `${baseStyles} ${sizeStyles} ${colorStyles}`;
  };

  const buttonStyles = [
    getVariantStyles(),
    getSizeStyles(),
    ''
  ].join(' ');

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      className={buttonStyles}>
      <View className="flex-row items-center justify-center gap-2">
        {loading && <ActivityIndicator size="small" color={disabled ? '#9CA3AF' : '#FFFFFF'} />}
        <Text className={getTextStyles()}>{title}</Text>
      </View>
    </Pressable>
  );
};

export default Button;
