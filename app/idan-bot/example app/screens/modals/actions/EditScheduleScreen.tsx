import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import {
  ScheduleManager,
  ScheduleManagerRef,
} from '@/screens/crew/settings/components/Schedule/ScheduleManager';

export default function EditScheduleScreen() {
  const { selectedDate } = useLocalSearchParams<{ selectedDate?: string }>();
  const navigation = useNavigation();
  const scheduleManagerRef = useRef<ScheduleManagerRef>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!scheduleManagerRef.current) return;

    setIsSaving(true);
    try {
      await scheduleManagerRef.current.savePendingChanges();
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const SaveButton = () => {
    const disabled = isSaving || !hasChanges;
    return (
      <Pressable onPress={handleSave} disabled={disabled}>
        <Text className={`text-base font-semibold ${disabled ? 'text-gray-400' : 'text-black'}`}>
          {isSaving ? 'שומר...' : 'שמור'}
        </Text>
      </Pressable>
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const currentHasChanges = scheduleManagerRef.current?.hasChanges || false;
      if (currentHasChanges !== hasChanges) {
        setHasChanges(currentHasChanges);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [hasChanges]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (hasChanges ? <SaveButton /> : null),
    });
  }, [hasChanges, isSaving, navigation]);

  return (
    <View style={{ direction: 'rtl' }} className="flex-1 gap-2">
      <ScheduleManager
        ref={scheduleManagerRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        className="flex-1"
        initialDate={selectedDate}
      />
    </View>
  );
}
