import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ContainerProps = {
  children: React.ReactNode;
  className?: string;
  topInset?: 'none' | 'medium' | 'full';
  withoutTopInset?: boolean;
};

export const Container = ({
  children,
  className,
  topInset = 'full',
  withoutTopInset = false,
}: ContainerProps) => {
  const insets = useSafeAreaInsets();
  const topPadding =
    withoutTopInset || topInset === 'none'
      ? 0
      : topInset === 'medium'
        ? insets.top / 3
        : insets.top;
  return (
    <View
      style={{ paddingTop: topPadding, backgroundColor: 'none' }}
      className={[styles.container, className].filter(Boolean).join(' ')}>
      {children}
    </View>
  );
};

const styles = {
  container: 'flex flex-1 bg-white',
};
