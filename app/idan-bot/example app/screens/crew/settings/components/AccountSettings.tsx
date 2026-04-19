import React from 'react';
import { Alert } from 'react-native';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';

interface AccountSettingsProps {
  onSignOut: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ onSignOut }) => {
  const handleSignOut = () => {
    Alert.alert('התנתקות', 'האם אתה בטוח שברצונך להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'התנתק',
        style: 'destructive',
        onPress: onSignOut,
      },
    ]);
  };

  return (
    <SettingsSection title="חשבון">
      <SettingsRow
        icon="log-out"
        title="התנתקות"
        subtitle=""
        onPress={handleSignOut}
        showChevron={false}
        iconColor="#FF3B30"
      />
    </SettingsSection>
  );
};