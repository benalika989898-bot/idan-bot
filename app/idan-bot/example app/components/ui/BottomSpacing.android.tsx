import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BottomSpacing = () => {
  const insets = useSafeAreaInsets();
  return <View style={{ paddingBottom: insets.bottom + 100 }} />;
};

export default BottomSpacing;
