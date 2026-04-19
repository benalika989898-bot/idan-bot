import {
  ScheduleManager,
  ScheduleManagerRef,
} from './components/Schedule/ScheduleManager';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScheduleSettingsScreen() {
  const insets = useSafeAreaInsets();
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
        <Text
          className={`px-4 text-base font-semibold ${disabled ? 'text-gray-400' : 'text-black'}`}>
          {isSaving ? 'שומר...' : 'שמירה'}
        </Text>
      </Pressable>
    );
  };

  const handleChangesStateChange = useCallback((nextHasChanges: boolean) => {
    setHasChanges(nextHasChanges);
  }, []);

  // Update navigation header when changes state or saving state changes
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (hasChanges ? <SaveButton /> : null),
    });
  }, [hasChanges, isSaving, navigation]);

  return (
    <View style={{ direction: 'rtl' }} className="flex-1 ">
      <ScheduleManager
        ref={scheduleManagerRef}
        onChangesStateChange={handleChangesStateChange}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        className="flex-1"
      />
    </View>
  );
}
