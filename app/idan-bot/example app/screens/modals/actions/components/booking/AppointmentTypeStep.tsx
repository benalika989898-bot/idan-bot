import { AppointmentType } from '@/types/appointments';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface AppointmentTypeStepProps {
  appointmentTypes: AppointmentType[];
  selectedAppointmentType: AppointmentType | null;
  setSelectedAppointmentType: (type: AppointmentType) => void;
  refreshControl?: React.ReactElement;
}

const AppointmentTypeStep: React.FC<AppointmentTypeStepProps> = ({
  appointmentTypes,
  selectedAppointmentType,
  setSelectedAppointmentType,
  refreshControl,
}) => {
  return (
    <View className="flex-1" style={{ direction: 'rtl' }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}>
        <View className="px-6 py-6">
          {appointmentTypes.map((type, index) => {
            const isSelected = selectedAppointmentType?.id === type.id;
            return (
              <Pressable
                key={type.id}
                onPress={() => setSelectedAppointmentType(type)}
                className={`py-5 ${index < appointmentTypes.length - 1 ? 'border-b border-gray-100' : ''} ${
                  isSelected ? 'bg-gray-50' : ''
                }`}
                style={{
                  marginHorizontal: isSelected ? -24 : 0,
                  paddingHorizontal: isSelected ? 24 : 0,
                }}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      {isSelected && <View className="h-2 w-2 rounded-full bg-black" />}
                      <Text
                        className={`text-lg font-semibold ${isSelected ? 'text-black' : 'text-black'}`}>
                        {type.name}
                      </Text>
                    </View>
                    {type.description && (
                      <Text className="mt-1 max-w-80 text-left text-sm leading-5 text-neutral-500">
                        {type.description}
                      </Text>
                    )}
                    <View className="mt-2 flex-row items-center">
                      <View className="flex-row items-center">
                        <Text className="text-xs text-gray-400">משך הטיפול: </Text>
                        <Text className="text-xs font-medium text-gray-500">
                          {type.duration_minutes} דקות
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-xl font-bold text-black">
                      {type.price ? `₪${type.price}` : 'ללא עלות'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

export default AppointmentTypeStep;
