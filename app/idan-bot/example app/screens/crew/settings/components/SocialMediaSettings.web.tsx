import React from 'react';
import { Alert } from 'react-native';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';

interface SocialMediaSettingsProps {
  whatsappUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  wazeUrl?: string;
}

export const SocialMediaSettings: React.FC<SocialMediaSettingsProps> = ({
  whatsappUrl,
  instagramUrl,
  facebookUrl,
  tiktokUrl,
  wazeUrl,
}) => {
  const handleSocialEdit = (
    platform: string,
    _urlKey: 'whatsapp_url' | 'instagram_url' | 'facebook_url' | 'tiktok_url' | 'waze_url',
    _placeholder: string,
    _currentUrl?: string
  ) => {
    Alert.alert(platform, 'יש לעדכן את הקישור דרך הגדרות מתקדמות', [
      { text: 'הבנתי', style: 'default' },
    ]);
  };

  return (
    <SettingsSection title="רשתות חברתיות">
      <SettingsRow
        icon="logo-whatsapp"
        title="WhatsApp"
        subtitle="קישור לשיחה"
        onPress={() =>
          handleSocialEdit('WhatsApp', 'whatsapp_url', 'https://wa.me/9725XXXXXXXX', whatsappUrl)
        }
        iconColor="#25D366"
        value={whatsappUrl ? 'מקושר' : ''}
      />
      <SettingsRow
        icon="logo-instagram"
        title="Instagram"
        subtitle="קישור לפרופיל"
        onPress={() =>
          handleSocialEdit(
            'Instagram',
            'instagram_url',
            'https://instagram.com/username',
            instagramUrl
          )
        }
        iconColor="#E1306C"
        value={instagramUrl ? 'מקושר' : ''}
      />
      <SettingsRow
        icon="logo-facebook"
        title="Facebook"
        subtitle="קישור לעמוד"
        onPress={() =>
          handleSocialEdit('Facebook', 'facebook_url', 'https://facebook.com/page', facebookUrl)
        }
        iconColor="#1877F2"
        value={facebookUrl ? 'מקושר' : ''}
      />
      <SettingsRow
        icon="logo-tiktok"
        title="TikTok"
        subtitle="קישור לפרופיל"
        onPress={() =>
          handleSocialEdit('TikTok', 'tiktok_url', 'https://tiktok.com/@username', tiktokUrl)
        }
        iconColor="#000"
        value={tiktokUrl ? 'מקושר' : ''}
      />
      <SettingsRow
        icon="navigate"
        title="Waze"
        subtitle="ניווט לסלון"
        onPress={() =>
          handleSocialEdit('Waze', 'waze_url', 'https://waze.com/ul?ll=latitude,longitude', wazeUrl)
        }
        iconColor="#33CCFF"
        value={wazeUrl ? 'מקושר' : ''}
      />
    </SettingsSection>
  );
};
