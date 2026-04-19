import React from 'react';
import { router } from 'expo-router';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';
import { useAuth } from '@/contexts/AuthContext';

export const BusinessSettings: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <SettingsSection title="העסק">
      {isAdmin && (
        <SettingsRow
          icon="images"
          title="ניהול תמונות"
          subtitle="תמונת רקע וסטורי"
          onPress={() => router.push('/(crew)/settings/media')}
          iconColor="#FF9500"
        />
      )}
      {isAdmin && (
        <SettingsRow
          icon="reorder-three"
          title="סדר אנשי צוות"
          subtitle="גרור כדי לשנות את סדר ההצגה"
          onPress={() => router.push('/(crew)/settings/crew-order')}
          iconColor="#6b7280"
        />
      )}
      {isAdmin && (
        <SettingsRow
          icon="chatbox-ellipses"
          title="לוח הודעות"
          subtitle="יצירה ופרסום הודעות למשתמשים"
          onPress={() => router.push('/(crew)/settings/message-board')}
          iconColor="#2563eb"
        />
      )}
      {isAdmin && (
        <SettingsRow
          icon="document-text"
          title="טקסט אודות"
          subtitle="כרטיס מתהפך בדף הבית"
          onPress={() => router.push('/(crew)/settings/about-text')}
          iconColor="#111827"
        />
      )}
      <SettingsRow
        icon="reorder-three"
        title="סדר סוגי טיפולים"
        subtitle="גרור כדי לשנות את סדר ההצגה"
        onPress={() => router.push('/(crew)/settings/appointment-types/order')}
        iconColor="#6b7280"
      />
    </SettingsSection>
  );
};
