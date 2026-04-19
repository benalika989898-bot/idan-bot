import { Container } from '@/components/Container';
import BottomSpacing from '@/components/ui/BottomSpacing';
import { useAuth } from '@/contexts/AuthContext';
import { getCrewSlotInterval } from '@/services/crew/members';
import { getAppSettings } from '@/services/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AccountSettings } from './components/AccountSettings';
import { BusinessSettings } from './components/BusinessSettings';
import { ProfileSection } from './components/ProfileSection';
import { SchedulingSettings } from './components/SchedulingSettings';
import { SocialMediaSettings } from './components/SocialMediaSettings';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const [dashboardViewMode, setDashboardViewMode] = useState<'calendar' | 'list'>('calendar');

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const { data, error } = await getAppSettings();
      if (error) throw error;
      return data;
    },
  });

  const { data: slotInterval } = useQuery({
    queryKey: ['crewSlotInterval', user?.id],
    queryFn: () => getCrewSlotInterval(user!.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    let isMounted = true;
    const loadMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('dashboard_view_mode');
        if (isMounted && (savedMode === 'calendar' || savedMode === 'list')) {
          setDashboardViewMode(savedMode);
        }
      } catch (error) {
        console.warn('Failed to load dashboard view mode', error);
      }
    };

    loadMode();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDashboardModeChange = async (mode: 'calendar' | 'list') => {
    setDashboardViewMode(mode);
    try {
      await AsyncStorage.setItem('dashboard_view_mode', mode);
    } catch (error) {
      console.warn('Failed to save dashboard view mode', error);
    }
  };

  return (
    <ScrollView
      className="flex-1 "
      style={{ direction: 'rtl' }}
      showsVerticalScrollIndicator={false}>
      <Container topInset="none">
        <ProfileSection />
        <BusinessSettings />
        <SchedulingSettings slotInterval={slotInterval ?? user?.slot_interval_minutes ?? 30} />
        <View className="mx-4 mb-4 rounded-xl bg-white p-4">
          <Text className="text-left text-base font-semibold text-gray-900">תצוגת דשבורד</Text>
          <Text className="mt-1 text-left text-xs text-gray-500">
            בחר את תצוגת ברירת המחדל בלוח הזמנים
          </Text>
          <View className="mt-3 flex-row items-center justify-between rounded-full bg-slate-100 p-1">
            <Pressable
              onPress={() => handleDashboardModeChange('calendar')}
              className={`flex-1 items-center justify-center rounded-full py-2 ${
                dashboardViewMode === 'calendar' ? 'bg-black' : 'bg-transparent'
              }`}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}>
              <Text
                className={`text-xs font-semibold ${
                  dashboardViewMode === 'calendar' ? 'text-white' : 'text-slate-700'
                }`}>
                לוח שנה
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleDashboardModeChange('list')}
              className={`flex-1 items-center justify-center rounded-full py-2 ${
                dashboardViewMode === 'list' ? 'bg-black' : 'bg-transparent'
              }`}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}>
              <Text
                className={`text-xs font-semibold ${
                  dashboardViewMode === 'list' ? 'text-white' : 'text-slate-700'
                }`}>
                רשימה
              </Text>
            </Pressable>
          </View>
        </View>
        {user?.role === 'admin' && (
          <SocialMediaSettings
            whatsappUrl={settings?.whatsapp_url}
            instagramUrl={settings?.instagram_url}
            facebookUrl={settings?.facebook_url}
            tiktokUrl={settings?.tiktok_url}
            wazeUrl={settings?.waze_url}
            appShareUrl={settings?.app_share_url}
            appSiteUrl={settings?.app_site_url}
          />
        )}
        <AccountSettings onSignOut={signOut} />

        {/* Bottom spacing */}
        <BottomSpacing />
      </Container>
    </ScrollView>
  );
}
