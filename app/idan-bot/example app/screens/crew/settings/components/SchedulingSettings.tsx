import React from 'react';
import { router } from 'expo-router';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';

interface SchedulingSettingsProps {
  slotInterval?: number;
}

export const SchedulingSettings: React.FC<SchedulingSettingsProps> = ({ slotInterval = 30 }) => (
  <SettingsSection title="זמנים והזמנות">
    <SettingsRow
      icon="calendar"
      title="עריכת זמנים"
      subtitle="ניהול לוח הזמנים השבועי"
      onPress={() => router.push('/(crew)/settings/schedule')}
      iconColor="#007AFF"
    />
    <SettingsRow
      icon="time"
      title="הגדרות הזמנה"
      subtitle={`מרווח זמן: ${slotInterval} דקות`}
      onPress={() => router.push('/(crew)/settings/booking-settings')}
      iconColor="#FF3B30"
      value={`${slotInterval} דק׳`}
    />
    <SettingsRow
      icon="medical"
      title="סוגי טיפולים"
      subtitle="הוספה, עריכה ומחיקה של סוגי טיפולים"
      onPress={() => router.push('/(crew)/settings/appointment-types')}
      iconColor="#34C759"
    />
    <SettingsRow
      icon="calendar-clear"
      title="תאריכי חופש"
      subtitle="ניהול תאריכים בהם לא תוכל לעבוד"
      onPress={() => router.push('/(crew)/settings/break-dates/')}
      iconColor="#FF9500"
    />
  </SettingsSection>
);