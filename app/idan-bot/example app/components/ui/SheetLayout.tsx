import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SheetLayoutProps = {
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

const SheetLayout = ({
  title,
  subtitle,
  badgeLabel,
  children,
  containerStyle,
}: SheetLayoutProps) => {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 justify-center  p-4" style={[containerStyle]}>
      <View className="rounded-3xl bg-white px-6 pb-8 pt-4 shadow-lg">
        <View className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-200" />

        <View className="items-center">
          <Text className="text-base font-semibold text-slate-900">{title}</Text>
          {subtitle ? <Text className="mt-1 text-sm text-slate-500">{subtitle}</Text> : null}
          {badgeLabel ? (
            <Text className="mt-3 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
              {badgeLabel}
            </Text>
          ) : null}
        </View>

        {children}
      </View>
    </View>
  );
};

export default SheetLayout;
