import { useSettings } from '@/contexts/SettingsContext';
import { Image } from 'expo-image';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT_RATIO = 0.45;

const Header = () => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { settings } = useSettings();

  const heroImageSource = settings?.hero_image_url
    ? { uri: settings.hero_image_url }
    : require('@/assets/images/logo.jpg');

  return (
    <View
      style={{
        height: screenHeight * HEADER_HEIGHT_RATIO + insets.top,
        backgroundColor: '#000',
      }}>
      <Image
        style={{
          height: '100%',
          width: '100%',
        }}
        source={heroImageSource}
        contentFit="cover"
        contentPosition="center top"
        transition={1000}
      />
    </View>
  );
};

export default Header;
